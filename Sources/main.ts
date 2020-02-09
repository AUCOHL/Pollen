/*
    main.ts
    Part of Pollen

    Copyright (C) 2018 Cloud V

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { Language, Filesystem } from "./Global.js";
import { SD, Bus } from "./Bus.js";
import { SoC } from "./SoC.js";

// Languages
import { Verilog } from "./Verilog.js";
import { default as Getopt } from "node-getopt";

function validate(language: Language, file: string, busName: string, hwModule: string, sd: SD): number {
    var rtl = Filesystem.readFileSync(file).toString();
    var bus = Bus.getByName(busName);
    var ports = language.extractPorts(hwModule, rtl, console.log);
    console.log(ports);

    var variableWidth = null;
    var error = false;

    for (var i in bus.signals) {
        var signal = bus.signals[i];
        
        var match = function(){
            for (var i in ports) {
                var port = ports[i];
                if (port.name === signal.name) {
                    return port;
                }
            }
            return null;
        }();

        if (signal.onSD(sd)) {
            if (match === null) {
                console.log(`ERROR: Port ${signal.name} does not exist on ${hwModule}.`);
                error = true;
            } else {
                    if (signal.width === -1) {
                        if (variableWidth === null) {
                            variableWidth = match.width;
                        } else if (match.width !== variableWidth) {
                            console.log(`ERROR: Variable port size ${variableWidth} violated by ${signal.name}[${match.width}].`);
                            error = true;
                        }
                    } else if (match.width !== signal.width) {
                        console.log(`ERROR: Port size ${signal.name}[${signal.width}] violated as ${match.width}.`);
                        error = true;
                    }
            }
        }
    }
    if (!error) {
        console.log(`VALIDATED: ${hwModule} is a valid ${busName} module${ (variableWidth === bus.defaultBits) ? '':
            ` with a non-standard bus width of ${variableWidth}`}.`);
        console.log('EXTRA PORTS:');
        console.log(ports);
        return 0;
    } else {
        return 65;
    }
}

function generateTopLevelModule(language: Language, file: string): string {
    var socString = Filesystem.readFileSync(file).toString();
    var socObject = JSON.parse(socString);
    var soc = SoC.fromObject(socObject);
    return language.fromSoC(soc);
}

function main(argv: string[]): number {

    var getopt = Getopt.create([
        ['h', 'help'                , 'Display this menu.'],
        ['o', 'outFile=ARG'             , 'File to output to'],
        ['v', 'validate=ARG'        , 'Bus to validate verilog module against.'],
        ['m', 'module=ARG'          , 'Module to validate against bus. (Required with validate option.)'],
        ['s', 'masterOrSlave=ARG'   , 'Master or slave? (Required with validate option.)']
    ]);
    getopt.setHelp(`
Usage: node ${argv[1]} [OPTIONS] <files>
[[OPTIONS]]
    `);

    var opt = getopt.parse(argv.slice(2));

    if (opt.argv.length != 1 || !opt.options['outFile']) {
        console.log(opt.argv, opt.options);
        getopt.showHelp();
        return 64;
    }
    var inputFilename = opt.argv[0];

    var language: Language = new Verilog();

    if (opt.options['validate']) {
        if (opt.options['module'] && opt.options['masterOrSlave']) {
            return validate(language, inputFilename, <string>opt.options['validate'], <string>opt.options['module'], SD[<string>opt.options['masterOrSlave']]);
        } else {
            getopt.showHelp();
            return 64;
        }
    } else {
        let string = generateTopLevelModule(language, inputFilename);
        Filesystem.writeFileSync(<string>opt.options['outFile'], string);
    }
}

process.exit(main(process.argv))