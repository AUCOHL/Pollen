/// <reference path="Bus.ts"/>
/// <reference path="SoC.ts"/>

/// <reference path="Verilog.ts"/>

var Getopt = require('node-getopt');
var Filesystem = require('fs');

function main(argv: string[]): number {

    var getopt = Getopt.create([
        ['h', 'help'                , 'Display this menu.']
    ]);
    getopt.setHelp(
        "Usage: node pollen.js [OPTIONS] <soc.json>\n" +
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
    var rtlFilename = inputFilename + ".v";
    var cHeaderFilename = inputFilename + ".c";
    
    var socString = Filesystem.readFileSync(inputFilename).toString();
    var socObject = JSON.parse(socString);
    var soc = SoC.fromObject(socObject);

    console.log(soc.toVerilog())

    return 0;
}

process.exit(main(process.argv))