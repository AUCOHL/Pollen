/// <reference path="Bus.ts"/>
/// <reference path="SoC.ts"/>
/// <reference path="Verilog.ts"/>

var Getopt = require('node-getopt');

function validate(language: Language, file: string, busName: string, hwModule: string, sd: SD): number {
    var rtl = Filesystem.readFileSync(file).toString();
    var bus = Bus.getByName(busName);
    var ports = language.extractPorts(hwModule, rtl, console.log);

    var variableWidth = null;
    var error = false;

    for (var i in bus.signals) {
        var signal = bus.signals[i];
        
        var match = ports.filter(port => port.name == signal.name)[0];
        if (signal.onSD(sd)) {
            if (match === undefined) {
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
            ports.splice(ports.indexOf(match), 1);
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

function generateTopLevelModule(language: Language, file: string): number {
    var socString = Filesystem.readFileSync(file).toString();
    var socObject = JSON.parse(socString);
    var soc = SoC.fromObject(socObject);
    console.log(language.fromSoC(soc));
    return 0;
}

function main(argv: string[]): number {

    var getopt = Getopt.create([
        ['h', 'help'                , 'Display this menu.'],
        ['v', 'validate=ARG'        , 'Bus to validate verilog module against.'],
        ['m', 'module=ARG'          , 'Module to validate against bus. (Required with validate option.)'],
        ['s', 'masterOrSlave=ARG'   , 'Master or slave? (Required with validate option.)']
    ]);
    getopt.setHelp(
        "Usage: node pollen.js [OPTIONS] <files>\n" +
        "\n" +
        "[[OPTIONS]]\n" +
        "\n"
      );

    var opt = getopt.parse(argv.slice(2));

    if (opt.argv.length != 1) {
        getopt.showHelp();
        return 64;
    }
    var inputFilename = opt.argv[0];

    var language: Language = new Verilog();

    if (opt.options['validate']) {
        if (opt.options['module'] && opt.options['masterOrSlave']) {
            return validate(language, inputFilename, opt.options['validate'], opt.options['module'], SD[<string>opt.options['masterOrSlave']]);
        } else {
            getopt.showHelp();
            return 64;
        }
    } else {
        return generateTopLevelModule(language, inputFilename);
    }
}

process.exit(main(process.argv))