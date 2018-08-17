/// <reference path="SoC.ts"/>
/// <reference path="Bus.ts"/>
/// <reference path="Global.ts"/>

var mathjs = require('mathjs');

class Verilog {

    net(type: string, signalWidth: number, width: number, name: string): string {
        return `${type} ${
            (signalWidth == 1) ? '':
            `[${Bus.widthGet(signalWidth, width) - 1}:0] `
        }${name};`;
    }

    fromIP(ip: IP, ports: Object[], prefix: string = ''): string {
        var instanceID = ip.instanceID(prefix);

        var instance = '';
        var rtl = Filesystem.readFileSync(`${globalInfo.rtlLocation}/${ip.owner}/${ip.id}/${ip.rtl}`).toString();

        var uniquePorts = this.extractPorts(ip.id, rtl, console.log);
        for (var i in uniquePorts) {
            var port = uniquePorts[i];
        }
        uniquePorts = uniquePorts.filter(port=> !(ip.parentBus.signalNames.indexOf(port.name) !== -1) && port.name != "INT");

        if (ip.type == "BRDG") {
            instance += `// Bridged IPs for ${instanceID}\n\n`
            instance += this.fromIPs(ports, ip.bridgedIPs, ip.bus, ip.busConfiguration, instanceID);
            instance += `// End of Bridged IPs for ${instanceID}\n\n`
        }

        instance += `${ip.id} ${instanceID}`;

        // Parameters
        instance += " #("
        for (var i in ip.configuration) {
            if (i === "NUM_INT" || i === "IRQ_NUMBER") {
                continue;
            }
            instance += `.${i}(${ip.configuration[i]}), `;
        }
        instance = instance.slice(0, -2) + ")";

        // Ports
        instance += " (";
        for (var i in ip.parentBus.signals) {
            var signal = ip.parentBus.signals[i];
            if (signal.onSD(ip.sd)) {
                if (!ip.isMaster() && ip.parentBus.multiplexed && signal.isMultiplexable()) {
                    instance += `.${signal.name}(${instanceID}_${signal.name}), `;
                } else {
                    instance += `.${signal.name}(${prefix}_${signal.name}), `;
                }
            }
        }

        if (ip.isMaster() && ip.configuration["NUM_INT"] !== undefined) {
            instance += ".INT(INT), ";
        }
        if (ip.configuration["IRQ_Number"] != undefined) {
            instance += `.INT(INT[${ip.configuration["IRQ_Number"]}]), `
        }

        if (ip.type == "BRDG") {
            for (var i in ip.bus.signals) {
                var signal = ip.bus.signals[i];
                if (signal.onSD(SD.master)) {
                    instance += `.${signal.name}(${instanceID}_${signal.name}), `;
                }
            }
        }

        for (var i in uniquePorts) {
            var port = uniquePorts[i];
            instance += `.${port.name}(${instanceID}_${port.name}), `;
            port.name = `${instanceID}_${port.name}`;
            ports[port.name] = port;
        }

        instance = instance.slice(0, -2) + ");"

        return instance;
    }

    fromIPs(ports: Object[], ips: IP[], bus: Bus, busConfiguration: Object, prefix: string = ''): string {
        var verilog = "";

        for (var i in bus.signals) {
            var signal = bus.signals[i];
            var portName = `${prefix}_${signal.name}`
            if (signal.asserter === SD.global) {
                ports[portName] = {
                    name: portName,
                    // prefix: outputPrefix
                    width: 1,
                    type: 'input'
                };
            } else if (signal.destination === SD.global) {
                ports[portName] = {
                    name: portName,
                    // prefix: outputPrefix
                    width: 1,
                    type: 'output'
                };
            }
        }

        var width = (busConfiguration && busConfiguration["width"]) ? busConfiguration["width"] : bus.defaultBits;
        if (!bus.multiplexed) {
            //MARK: TO-DO
        }
        else {
            // Generate wires/registers
            verilog += '// Wires/Registers\n';
            for (var i in bus.signals) {
                var signal = bus.signals[i];
                if (signal.asserter === SD.slave) { // If it's the selection line or a slave-driven line, we're gonna need 'em muxed.
                    for (var j in ips) {
                        var ip = ips[j];
                        if (ip.isMaster()) {
                            continue;
                        }

                        verilog += this.net('wire', signal.width, width, `${ip.instanceID(prefix)}_${signal.name}`);
                        verilog += '\n';
                    }
                    verilog += this.net('reg', signal.width, width, `${prefix}_${signal.name}`);
                    verilog += '\n';
                } else if (signal.asserter !== SD.global) {
                    for (var j in ips) {
                        var ip = ips[j];
                        if (ip.isMaster()) {
                            continue;
                        }

                        verilog += this.net('reg', signal.width, width, `${ip.instanceID(prefix)}_${signal.name}`);
                        verilog += '\n';
                    }
                    verilog += this.net('wire', signal.width, width, `${prefix}_${signal.name}`);
                    verilog += '\n';
                }
            }
            ///// INT Lines
            var master = ips.filter(ip => ip.isMaster())[0];
            if (master !== undefined && master.configuration["NUM_INT"] !== undefined) {
                verilog += `wire [${master.configuration["NUM_INT"] - 1}:0] INT;\n`;
            }


            verilog += '\n';

            // Generate decoder/multiplexer
            var addressLine   = bus.signals.filter(signal => signal.destination == SD.decoder)[0];
            var selectionLine = bus.signals.filter(signal => signal.asserter == SD.decoder)[0];
            if ((addressLine !== undefined) && (selectionLine !== undefined)) {
                var baseAddresses = []
                var assignBlock = '';
                var ipsByAddressLine = ips.concat().sort((a, b) => b.baseAddress - a.baseAddress);

                verilog += '// Decoder\n';
                verilog += `always @ * begin\n`;
                for (var i in ipsByAddressLine) {
                    var ip = ipsByAddressLine[i];
                    if (ip.isMaster()) {
                        continue;
                    }
                    verilog +=   `    ${ip.instanceID(prefix)}_${selectionLine.name} <= 1'b0;\n`;
                    assignBlock += `    if (${prefix}_${addressLine.name} >= ${ip.baseAddress}) begin\n`;
                    assignBlock += `        ${ip.instanceID(prefix)}_${selectionLine.name} <= 1'b1;\n`;
                    assignBlock += `    end else`
                }
                assignBlock += "    #0; // State should not exist.\n"
                verilog += '\n';
                verilog += assignBlock;
                verilog += 'end\n\n';

                var multiplexableSignals = bus.signals.filter(signal => signal.isMultiplexable() && signal != selectionLine);
                var slaves = ips.filter(ip => !ip.isMaster());

                verilog += '// Multiplexer\n';
                verilog += `always @ * begin\n`;
                for (var i in multiplexableSignals) {
                    var signal = multiplexableSignals[i];
                    var declaration = '';
                    if (signal.destination == SD.multiplexer) {
                        var forward = bus.signals.filter(forwarded=> (forwarded.asserter == SD.multiplexer) && (forwarded.forwarding === signal.name))[0];
                        declaration += `    ${prefix}_${forward.name} <= `;
                    } else {
                        declaration += `    ${prefix}_${signal.name} <= `
                    }
                    for (var j in slaves) {
                        var slave = slaves[j];
                        var instanceID = slave.instanceID(prefix);
                        if (declaration.slice(-1) == '\n') {
                            declaration += '        ';
                        }
                        declaration += `(${instanceID}_${signal.name} & {${Bus.widthGet(signal.width, width)}{${instanceID}_${selectionLine.name}}}) |\n`;
                    }
                    verilog += declaration.slice(0, -3) + ";\n";
                }
                verilog += 'end\n\n';
            }


            // Generate IP instances
            for (var i in ips) {
                var ip = ips[i];
                verilog += ip.toVerilog(ports, prefix);
                verilog += '\n\n';
            }
        }

        return verilog
    }

    fromSoC(soc: SoC): string {
        var ports = [];
    
        let verilog = `
/*
* ${soc.name}
* 
* Generated by Pollen for Cloud V
* ${new Date()}
*/

module ${soc.name}([[__PORT_LISTING__]]);

[[__PORT_POLARITIES__]]
`;
        verilog += this.fromIPs(ports, soc.ips, soc.bus, soc.busConfiguration, soc.name);
        verilog += 'endmodule';
    
        ports.map(h=> console.log(h));
    
        var portListing = '';
        var portPolarities = '//Port Polarities\n';
        for (var key in ports) {
            portListing += ports[key].name;
            portListing += ', ';
    
            portPolarities += this.net(ports[key].type, ports[key].width, ports[key].width, ports[key].name) + "\n";
        }
    
        verilog = verilog.
            replace('[[__PORT_LISTING__]]', portListing.slice(0, -2)).
            replace('[[__PORT_POLARITIES__]]', portPolarities);
        return verilog;
    }

    // Code adapted from Cloud V testbench generator.
    extractPorts(sourceModule: string, rtl: string, cb: any): any[] {
        let e, end, hasParams, inputNames, inputPrefix, outputNames, outputPrefix, start;
        rtl = rtl.replace(/\/\/.*$/gm, '').replace(/\/\*(.|[\r\n])*?\*\//gm, '');
    
        //Extracing modules.
        const _getModuleRegex = () => new RegExp("\\s*module\\s+(\\w+)\\s*(#\\s*\\(([\\s\\S]+?)\\)\\s*)??\\s*((\\([\\s\\S]*?\\))?)\\s*;\\s*([\\s\\S]*?)\\s*\\bendmodule\\b", "gm");
        const _getIORegex = modifier => new RegExp(`\\s*${modifier.trim()}\\s+((\\[\\s*(\\w+)\\s*\\:\\s*(\\w+)\\s*\\]\\s*)?)([\\s\\S]+?)\\s*[;]`, "gm");
    
        const _getInputRegex = () => new RegExp("(input)(\\s*\\[\\s*([\\s\\S]+?)\\s*\\:\\s*([\\s\\S]+?)\\s*\\]\\s*|\\s+)([\\s\\S]+?)\\s*[;]", 'gm');
        const _getOutputRegex = () => new RegExp("((output\\s+reg)|(output))(\\s*\\[\\s*([\\s\\S]+?)\\s*\\:\\s*([\\s\\S]+?)\\s*\\]\\s*|\\s+)([\\s\\S]+?)\\s*[;]", 'gm');
        const _getParamRegex = function(modifiers) { if (modifiers == null) { modifiers = 'gm'; } return new RegExp("(parameter)(\\s*\\[\\s*(\\d+)\\s*\\:\\s*(\\d+)\\s*\\]\\s*|\\s+)([\\s\\S]+?)\\s*[;,\\)]", modifiers); };
        const _getParamContentRegex = () => new RegExp("([\\s\\S]*?)\\s*=\\s*([\\s\\S]+)", 'gm');
        const _getLiteralsRegex = () => new RegExp("\\s*(\\d+)\\s*\\'([bodh])\\s*([\\dabcdefABCDEF_]+)\\s*", "mi");
    
        const moduleRegex = _getModuleRegex();
        const modules = {};
        let matches = moduleRegex.exec(rtl);
    
        const _clearParams = function(body) {
            const paramRegx = _getParamRegex(null);
            const replacementRegex = _getParamRegex('m');
            let paramMatches = paramRegx.exec(body);
            while (paramMatches != null) {
                body = body.replace(replacementRegex, '');
                const paramAssign = paramMatches[5].split(/\s*,\s*/gm);
                for (let assign of paramAssign) {
                    const handSides = _getParamContentRegex().exec(assign);
                    const lhs = handSides[1];
                    let rhs = handSides[2];
                    const literalsRegex = _getLiteralsRegex();
                    const literalsReplacementRegex = _getLiteralsRegex();
                    let literalMatches = literalsRegex.exec(rhs);
                    while (literalMatches != null) {
                        const numberOfBits = parseInt(literalMatches[1]);
                        const base = literalMatches[2].toLowerCase();
                        let value = literalMatches[3].toLowerCase();
                        value = value.replace(/_/gm, '');
                        const maxValue = Math.pow(2, numberOfBits + 1) - 1;
                        let decimalValue = undefined;
                        switch (base) {
                            case 'b':
                                decimalValue = parseInt(value, 2);
                                break;
                            case 'o':
                                decimalValue = parseInt(value, 8);
                                break;
                            case 'd':
                                decimalValue = parseInt(value, 10);
                                break;
                            case 'h':
                                decimalValue = parseInt(value, 16);
                                break;
                        }
                        if (decimalValue > maxValue) {
                            throw {error: `The value ${value} exceeds the available ${numberOfBits} bits (max: ${maxValue}).`};
                        }
                        rhs = rhs.replace(literalsReplacementRegex, decimalValue);
                        literalMatches = _getLiteralsRegex().exec(rhs);
                    }
    
                    const rhsEval = mathjs.eval(rhs);
                    body = body.replace(new RegExp(`\\b${lhs}\\b`, 'gm'), rhsEval);
                }
                paramMatches = _getParamRegex(null).exec(body);
            }
            return body;
        };
    
        while (matches != null) {
            const moduleContent = matches[0];
            const moduleName = matches[1];
            const moduleHeaderParams = matches[3];
            const moduleParams = matches[4];
            let moduleBody = matches[6];
    
    
            try {
                if (moduleHeaderParams != null) {
                    moduleBody = _clearParams(`${moduleHeaderParams};\n${moduleBody}`);
                } else {
                    moduleBody = _clearParams(moduleBody);
                }
            } catch (error) {
                e = error;
                if (e.error != null) {
                    return cb(e);
                } else {
                    console.error(e);
                    return cb({error: 'Invalid usage of parameters.'});
                }
            }
            hasParams = (moduleParams.trim() !== '') && !/\( *\)/gm.test(moduleParams);
            let parsedParams = [];
            if (hasParams) {
                parsedParams = (/\( *([\s\S]+?) *\)/g).exec(moduleParams)[1].trim().split(/\s*,\s*/gm);
            }
    
            modules[moduleName] = {
                name: moduleName,
                rtl: moduleContent,
                params: parsedParams,
                body: moduleBody,
                hasParams
            };
            matches = moduleRegex.exec(rtl);
        }
    
        if ((modules[sourceModule] == null)) {
            return cb({error: `Module ${sourceModule} does not exist in the source file.`});
        }
    
        const targetModule = modules[sourceModule];
        const sourceModuleContent = targetModule.rtl;
        const sourceModuleBody = targetModule.body;
    
        //Extracting inputs/outputs.
        const inputs = [];
        const outputs = [];
    
        if (targetModule.hasParams) {
            for (let param of targetModule.params) {
                let paramMatches = /^(input)(?:\s+wire\s+)?(\s*\[\s*([\s\S]+?)\s*\:\s*([\s\S]+?)\s*\]\s*|\s+)([\s\S]+?)\s*$/gm.exec(param);
                if (paramMatches != null) {
                    inputPrefix = '';
                    start = (end = undefined);
                    if ((paramMatches[3] != null) && (paramMatches[4] != null)) {
                        try {
                            start = mathjs.eval(paramMatches[3].trim());
                            end = mathjs.eval(paramMatches[4].trim());
                            inputPrefix = `[${start}: ${end}] `;
                        } catch (error1) {
                            e = error1;
                            console.error(e);
                            return cb({error: `Evaluation failed for [${paramMatches[3].trim()}: ${paramMatches[4].trim()}]`});
                        }
                    }
                    inputNames = paramMatches[5].split(/\s*,\s*/m);
                    inputNames.forEach(function(inputName) {
                        if (inputName.trim === '') { return; }
                        var matches = /(?:wire|reg)(?:\s+\[[0-9]+:[0-9]+\])?\s+([_A-Za-z][_A-Za-z0-9]+)/g.exec(inputName);
                        if (matches !== null) {
                            inputName = matches[1];
                        }
                        if ((start != null) && (end != null)) {
                            if (end < start) {
                                const temp = start;
                                start = end;
                                end = temp;
                            }
                            inputs.push({
                                name: inputName,
                                // prefix: inputPrefix
                                width: end - start + 1,
                                type: 'input',
                                instance: `${inputName}`
                            });
                        } else {
                            return inputs.push({
                                name: inputName,
                                // prefix: inputPrefix
                                width: 1,
                                type: 'input',
                                instance: `${inputName}`
                            });
                        }
                    });
                } else {
                    paramMatches = /^((output))(?:\s+(wire|reg)\s+)?(\s*\[\s*([\s\S]+?)\s*\:\s*([\s\S]+?)\s*\]\s*|\s+)([\s\S]+?)\s*$/gm.exec(param);
                    if (paramMatches != null) {
                        outputPrefix = '';
                        start = (end = undefined);
                        if ((paramMatches[5] != null) && (paramMatches[6] != null)) {
                            try {
                                start = mathjs.eval(paramMatches[5].trim());
                                end = mathjs.eval(paramMatches[6].trim());
                                outputPrefix = `[${start}: ${end}] `;
                            } catch (error2) {
                                e = error2;
                                console.error(e);
                                return cb({error: `Evaluation failed for [${paramMatches[5].trim()}: ${paramMatches[6].trim()}]`});
                            }
                        }
                        outputNames = paramMatches[7].split(/\s*,\s*/m);
                        outputNames.forEach(function(outputName) {
                            if (outputName.trim() === '') { return; }
                            var matches = /(?:wire|reg)(?:\s+\[[0-9]+:[0-9]+\])?\s+([_A-Za-z][_A-Za-z0-9]+)/g.exec(outputName);
                            if (matches !== null) {
                                outputName = matches[1];
                            }
                            if ((start != null) && (end != null)) {
                                if (end < start) {
                                    const temp = start;
                                    start = end;
                                    end = temp;
                                }
                                
                                outputs.push({
                                    name: outputName,
                                    // prefix: outputPrefix
                                    width: end - start + 1,
                                    type: 'output',
                                    instance: `${outputName}`
                                });
                            } else {
                                return outputs.push({
                                    name: outputName,
                                    // prefix: outputPrefix
                                    width: 1,
                                    type: 'output',
                                    instance: `${outputName}`
                                });
                            }
                        });
                    }
                }
            }
        }
    
    
        const inputsRegex = _getInputRegex();
        const outputsRegex = _getOutputRegex();
    
        matches = inputsRegex.exec(sourceModuleBody);
        while (matches != null) {
            inputPrefix = '';
            start = (end = undefined);
            if ((matches[3] != null) && (matches[4] != null)) {
                try {
                    start = mathjs.eval(matches[3].trim());
                    end = mathjs.eval(matches[4].trim());
                    inputPrefix = `[${start}: ${end}] `;
                } catch (error3) {
                    e = error3;
                    console.error(e);
                    return cb({error: `Evaluation failed for [${matches[3].trim()}: ${matches[4].trim()}]`});
                }
            }
            inputNames = matches[5].split(/\s*,\s*/m);
            inputNames.forEach(function(inputName) {
                if (inputName.trim === '') { return; }
                var matches = /(?:wire|reg)(?:\s+\[[0-9]+:[0-9]+\])?\s+([_A-Za-z][_A-Za-z0-9]+)/g.exec(inputName);
                if (matches !== null) {
                    inputName = matches[1];
                }
                if ((start != null) && (end != null)) {
                    if (end < start) {
                        const temp = start;
                        start = end;
                        end = temp;
                    }
                    inputs.push({
                        name: inputName,
                        // prefix: inputPrefix
                        width: end - start + 1,
                        type: 'input',
                        instance: `${inputName}`
                    });
                } else {
                    return inputs.push({
                        name: inputName,
                        // prefix: inputPrefix
                        index: 1,
                        type: 'input',
                        instance: `${inputName}`
                    });
                }
            });
            matches = inputsRegex.exec(sourceModuleBody);
        }
    
        matches = outputsRegex.exec(sourceModuleBody);
        while (matches != null) {
            outputPrefix = '';
            start = (end = undefined);
            if ((matches[5] != null) && (matches[6] != null)) {
                try {
                    start = mathjs.eval(matches[5].trim());
                    end = mathjs.eval(matches[6].trim());
                    outputPrefix = `[${start}: ${end}] `;
                } catch (error4) {
                    e = error4;
                    console.error(e);
                    return cb({error: `Evaluation failed for [${matches[5].trim()}: ${matches[6].trim()}]`});
                }
            }
            outputNames = matches[7].split(/\s*,\s*/m);
            outputNames.forEach(function(outputName) {
                if (outputName.trim() === '') { return; }
                var matches = /(?:wire|reg)(?:\s+\[[0-9]+:[0-9]+\])?\s+([_A-Za-z][_A-Za-z0-9]+)/g.exec(outputName);
                if (matches !== null) {
                    outputName = matches[1];
                }
                if ((start != null) && (end != null)) {
                    if (end < start) {
                        const temp = start;
                        start = end;
                        end = temp;
                    }
                    inputs.push({
                        name: outputName,
                        // prefix: outputPrefix
                        width: end - start + 1,
                        type: 'output',
                        instance: `${outputName}`
                    });
                } else {
                    return outputs.push({
                        name: outputName,
                        // prefix: outputPrefix
                        width: 1,
                        type: 'output',
                        instance: `${outputName}`
                    });
                }
            });
            matches = outputsRegex.exec(sourceModuleBody);
        }
    
        return (inputs.concat(outputs));
    };
}

interface IP {
    toVerilog(ports: Object[], prefix: string): string;
}

IP.prototype.toVerilog = function(ports: Object[], prefix: string = ''): string {
    var language = new Verilog();
    return language.fromIP(this, ports, prefix);
}

interface SoC {
    toVerilog(): string;
}

SoC.prototype.toVerilog = function(): string  {
    var language = new Verilog();
    return language.fromSoC(this);
}