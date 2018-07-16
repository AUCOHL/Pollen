"use strict";
var SD;
(function (SD) {
    SD[SD["master"] = 0] = "master";
    SD[SD["slave"] = 1] = "slave";
    SD[SD["globalClock"] = 2] = "globalClock";
    SD[SD["globalReset"] = 3] = "globalReset";
    SD[SD["decoder"] = 4] = "decoder";
    SD[SD["multiplexer"] = 5] = "multiplexer";
    SD[SD["all"] = 6] = "all";
})(SD || (SD = {}));
var Signal = /** @class */ (function () {
    function Signal(name, asserter, asserterName, resetActiveHigh, resetSynchronous, destination, width) {
        this.name = name;
        this.asserter = asserter;
        this.asserterName = asserterName;
        this.resetActiveHigh = resetActiveHigh;
        this.resetSynchronous = resetSynchronous;
        this.destination = destination;
        this.width = width;
    }
    Signal.fromObject = function (object, defaultBits) {
        var newSignal = new Signal(null, null, null, null, null, null, null);
        newSignal.name = object["name"];
        newSignal.asserter = SD[object["asserter"]];
        newSignal.asserterName = object["asserterName"];
        newSignal.resetActiveHigh = object["resetActiveHigh"];
        newSignal.resetSynchronous = object["resetSynchronous"];
        newSignal.destination = SD[object["destination"]];
        var width = object["width"];
        newSignal.width = (width == -1) ? defaultBits : width;
        return newSignal;
    };
    return Signal;
}());
var Bus = /** @class */ (function () {
    function Bus(name, creator, creatorID, multiplexed, defaultBits, signals) {
        this.name = name;
        this.creator = creator;
        this.multiplexed = multiplexed;
        this.defaultBits = defaultBits;
        this.signals = signals;
    }
    Bus.fromObject = function (object) {
        var newBus = new Bus(null, null, null, null, null, null);
        newBus.name = object["name"];
        newBus.creator = object["creator"];
        newBus.creatorID = object["creatorID"];
        newBus.multiplexed = object["multiplexed"];
        newBus.defaultBits = object["defaultBits"];
        newBus.signals = [];
        var signalList = object["signals"];
        for (var i = 0; i < signalList.length; i += 1) {
            var signal = Signal.fromObject(signalList[i], newBus.defaultBits);
            newBus.signals.push(signal);
        }
        return newBus;
    };
    Bus.getByName = function (name) {
        if (this.buses[name] === undefined) {
            var busString = Filesystem.readFileSync("./Buses/" + name + "/manifest.json");
            var busObject = JSON.parse(busString);
            this.buses[name] = Bus.fromObject(busObject);
        }
        return this.buses[name];
    };
    Bus.buses = {};
    return Bus;
}());
var Affinity;
(function (Affinity) {
    Affinity[Affinity["infrastructure"] = 0] = "infrastructure";
    Affinity[Affinity["digital"] = 1] = "digital";
    Affinity[Affinity["analog"] = 2] = "analog";
    Affinity[Affinity["comm"] = 3] = "comm";
    Affinity[Affinity["accelerator"] = 4] = "accelerator";
    Affinity[Affinity["other"] = 5] = "other";
})(Affinity || (Affinity = {}));
var IP = /** @class */ (function () {
    function IP(owner, id, type, affinity, rtl, baseAddress, section, configuration, parentBus, bus, bridgedIPs) {
        this.owner = owner;
        this.id = id;
        this.type = type;
        this.affinity = affinity;
        this.rtl = rtl;
        this.baseAddress = baseAddress;
        this.section = section;
        this.configuration = configuration;
        this.parentBus = parentBus;
        this.bus = bus;
        this.bridgedIPs = bridgedIPs;
        this.sd = (this.isMaster()) ? SD.master : SD.slave;
    }
    IP.prototype.isMaster = function () {
        return (this.baseAddress == null);
    };
    IP.prototype.toVerilog = function (prefix, signalPrefix) {
        if (prefix === void 0) { prefix = ''; }
        if (signalPrefix === void 0) { signalPrefix = ''; }
        var instanceID = prefix + "_" + this.id;
        var instance = '';
        if (this.type == "BRDG") {
            instance += "// Bridged IPs for " + instanceID + "\n\n";
            for (var i in this.bus.signals) {
                var signal = this.bus.signals[i];
                if (signal.width === 1) {
                    instance += "wire " + signal.name + ";";
                }
                else {
                    instance += "wire [" + (signal.width - 1) + ":0] " + signal.name + ";";
                }
                instance += '\n';
            }
            instance += '\n';
            for (var i in this.bridgedIPs) {
                var ip = this.bridgedIPs[i];
                instance += ip.toVerilog(instanceID + "_" + i, instanceID);
                instance += '\n\n';
            }
            instance += "// End of Bridged IPs for " + instanceID + "\n\n";
        }
        instance += this.id + " " + instanceID + "(";
        for (var i in this.parentBus.signals) {
            var signal = this.parentBus.signals[i];
            console.log(signal.asserter, this.sd, signal.name, signal.asserterName);
            if (signal.asserter == this.sd && signal.asserterName != null) {
                instance += "." + signal.asserterName + "(" + signalPrefix + "_" + signal.asserterName + "), ";
            }
            else if ((signal.destination == this.sd) ||
                (signal.destination == SD.all) ||
                (signal.destination == undefined)) {
                instance += "." + signal.name + "(" + signalPrefix + "_" + signal.name + "), ";
            }
        }
        if (this.type == "BRDG") {
            for (var i in this.bus.signals) {
                var signal = this.bus.signals[i];
                if (signal.asserter == SD.master && signal.asserterName != null) {
                    instance += "." + signal.asserterName + "(" + instanceID + "_" + signal.asserterName + "), ";
                }
                else if ((signal.destination == SD.master) ||
                    (signal.destination == SD.all) ||
                    (signal.destination == undefined)) {
                    instance += "." + signal.name + "(" + instanceID + "_" + signal.name + "), ";
                }
            }
        }
        instance = instance.slice(0, -2) + ");";
        return instance;
    };
    IP.fromObject = function (object, parentBus) {
        var newIP = new IP(null, null, null, null, null, null, null, null, null, null, null);
        newIP.owner = object["owner"];
        newIP.id = object["id"];
        newIP.type = object["type"];
        newIP.affinity = Affinity[object["affinity"]];
        newIP.rtl = object["rtl"];
        newIP.baseAddress = object["baseAddress"];
        newIP.section = object["section"];
        newIP.configuration = object["configuration"];
        newIP.parentBus = parentBus;
        newIP.sd = (newIP.isMaster()) ? SD.master : SD.slave;
        if (newIP.type == "BRDG") {
            newIP.bus = Bus.getByName(object["bus"]);
            newIP.bridgedIPs = [];
            var ipList = object["bridgedIPs"];
            for (var i = 0; i <= ipList.length; i += 1) {
                if (ipList[i] !== undefined) {
                    newIP.bridgedIPs.push(IP.fromObject(ipList[i], newIP.bus));
                }
            }
        }
        return newIP;
    };
    return IP;
}());
var SoC = /** @class */ (function () {
    function SoC(name, bus, busConfigurations, ips) {
        this.name = name;
        this.bus = bus;
        this.busConfigurations = busConfigurations;
        this.ips = ips;
    }
    SoC.prototype.toVerilog = function () {
        var verilog = "\n/*\n * " + this.name + "\n * \n * Generated by the Pollen SoC Generator\n * " + new Date() + "\n * /\n\nmodule " + this.name + ";\n\n";
        for (var i in this.bus.signals) {
            var signal = this.bus.signals[i];
            if (signal.width === 1) {
                verilog += "wire " + signal.name + ";";
            }
            else {
                verilog += "wire [" + (signal.width - 1) + ":0] " + signal.name + ";";
            }
            verilog += '\n';
        }
        verilog += '\n';
        for (var i in this.ips) {
            var ip = this.ips[i];
            verilog += ip.toVerilog(this.name + "_" + i, this.name);
            verilog += '\n\n';
        }
        verilog += 'endmodule';
        return verilog;
    };
    SoC.fromObject = function (object) {
        var newSoC = new SoC(null, null, null, null);
        newSoC.name = object["name"];
        newSoC.bus = Bus.getByName(object["bus"]);
        newSoC.busConfigurations = object["busConfigurations"];
        newSoC.ips = [];
        var ipList = object["ips"];
        for (var i = 0; i <= ipList.length; i += 1) {
            if (ipList[i] !== undefined) {
                newSoC.ips.push(IP.fromObject(ipList[i], newSoC.bus));
            }
        }
        return newSoC;
    };
    return SoC;
}());
/// <reference path="Bus.ts"/>
/// <reference path="SoC.ts"/>
var Getopt = require('node-getopt');
var Filesystem = require('fs');
function main(argv) {
    var getopt = Getopt.create([
        ['h', 'help', 'Display this menu.']
    ]);
    getopt.setHelp("Usage: node pollen.js [OPTIONS] <soc.json>\n" +
        "\n" +
        "[[OPTIONS]]\n" +
        "\n");
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
    console.log(soc.toVerilog());
    return 0;
}
process.exit(main(process.argv));
