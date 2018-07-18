/// <reference path="SoC.ts"/>
/// <reference path="Bus.ts"/>

class Verilog {
    static fromIPs(ips: IP[], bus: Bus, busConfiguration: Object, prefix: string): string {
        var verilog = "";
        var width = (busConfiguration && busConfiguration["width"]) ? busConfiguration["width"] : bus.defaultBits;
        if (!bus.multiplexed) {
            //MARK: TO-DO
        }
        else {
            // Generate wires/registers
            verilog += '// Wires/Registers\n';
            for (var i in bus.signals) {
                var signal = bus.signals[i];
                if (signal.asserter === SD.decoder || signal.asserter == SD.slave) { // If it's the selection line or a slave-driven line, we're gonna need 'em muxed.
                    for (var j in ips) {
                        var ip = ips[j];
                        if (ip.isMaster()) {
                            continue;
                        }

                        verilog += `reg ${
                            (signal.width == 1) ? '':
                            `[${Bus.widthGet(signal.width, width) - 1}:0] `
                        }${ip.instanceID(prefix)}_${signal.name};`;
                        verilog += '\n';
                    }
                } else {
                    verilog += `reg ${
                        (signal.width == 1) ? '':
                        `[${Bus.widthGet(signal.width, width) - 1}:0] `
                    }${prefix}_${signal.name};`;
                    verilog += '\n';
                }
            }
            ///// INT Lines
            var master = ips.filter(ip => ip.isMaster())[0];
            if (master !== undefined && master.configuration["Num_Int"] !== undefined) {
                verilog += `wire [${master.configuration["Num_Int"] - 1}:0] INT;\n`;
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

                verilog += '// """Multiplexer"""\n';
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
                        declaration += `(${instanceID}_${signal.name} & {${Bus.widthGet(signal.width, width)}{${instanceID}_${selectionLine.name}}}) ||\n`;
                    }
                    verilog += declaration.slice(0, -3) + ";\n";
                }
                verilog += 'end\n\n';
            }


            // Generate IP instances
            for (var i in ips) {
                var ip = ips[i];
                verilog += ip.toVerilog(prefix);
                verilog += '\n\n';
            }
        }

        return verilog
    }
}

interface IP {
    toVerilog(prefix: string): string;
}

IP.prototype.toVerilog = function(prefix: string = ''): string {
    var instanceID = this.instanceID(prefix);

    var instance = '';

    if (this.type == "BRDG") {
        instance += `// Bridged IPs for ${instanceID}\n\n`
        instance += Verilog.fromIPs(this.bridgedIPs, this.bus, this.busConfiguration, instanceID);
        instance += `// End of Bridged IPs for ${instanceID}\n\n`
    }

    instance += `${this.id} ${instanceID}(`;

    for (var i in this.parentBus.signals) {
        var signal = this.parentBus.signals[i];
        if (
            (signal.asserter === this.sd) ||
            (signal.destination === undefined) && (Assertion.rules[signal.asserter].includes(this.sd)) ||
            (signal.destination !== undefined) && (Destination.rules[signal.destination].includes(this.sd))
        ) {
            if (!this.isMaster() && this.parentBus.multiplexed && signal.isMultiplexable()) {
                instance += `.${signal.name}(${instanceID}_${signal.name}), `;
            } else {
                instance += `.${signal.name}(${prefix}_${signal.name}), `;
            }
        }
    }

    if (this.isMaster() && this.configuration["Num_Int"] !== undefined) {
        instance += ".INT(INT), ";
    }
    if (this.configuration["IRQ_Number"] != undefined) {
        instance += `.INT(INT[${this.configuration["IRQ_Number"]}]), `
    }

    if (this.type == "BRDG") {
        for (var i in this.bus.signals) {
            var signal = this.bus.signals[i];
            if (
                (signal.asserter === this.sd) ||
                (signal.destination === undefined) && (Assertion.rules[signal.asserter].includes(this.sd)) ||
                (signal.destination !== undefined) && (Destination.rules[signal.destination].includes(this.sd))
            ) {
                instance += `.${signal.name}(${instanceID}_${signal.name}), `;
            }
        }
    }

    instance = instance.slice(0, -2) + ");"

    return instance;
}

interface SoC {
    toVerilog(): string;
}

SoC.prototype.toVerilog = function(): string  {
    let verilog = `
/*
* ${this.name}
* 
* Generated by the Pollen SoC Generator
* ${new Date()}
*/

module ${this.name};

`;
    verilog += Verilog.fromIPs(this.ips, this.bus, this.busConfiguration, this.name);

    verilog += 'endmodule';
    return verilog
}