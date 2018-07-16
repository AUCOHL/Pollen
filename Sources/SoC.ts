enum Affinity {
    infrastructure = 0,
    digital,
    analog,
    comm,
    accelerator,
    other
}

class IP {
    owner: string;
    id: string;
    type: string
    affinity: Affinity;
    rtl: string;
    baseAddress: number;
    section: string;
    configuration: Object;
    parentBus: Bus;
    sd: SD;
    bus: Bus;
    busConfiguration: Object;
    bridgedIPs: IP[];

    isMaster(): boolean {
        return (this.baseAddress == null);
    }

    toVerilog(prefix: string = '', signalPrefix: string = ''): string {
        var instanceID = `${prefix}_${this.id}`;

        var instance = '';

        if (this.type == "BRDG") {
            instance += `// Bridged IPs for ${instanceID}\n\n`
            instance += IP.ipsToVerilog(this.bridgedIPs, this.bus, this.busConfiguration, instanceID);
            instance += `// End of Bridged IPs for ${instanceID}\n\n`
        }

        instance += `${this.id} ${instanceID}(`;

        for (var i in this.parentBus.signals) {
            var signal = this.parentBus.signals[i];
            if ((signal.asserter    == this.sd) ||
                (signal.destination == this.sd) ||
                (signal.destination == SD.all)    ||
                (signal.destination == undefined)
            ) {
                instance += `.${signal.name}(${signalPrefix}_${signal.name}), `;
            }
        }

        if (this.type == "BRDG") {
            for (var i in this.bus.signals) {
                var signal = this.bus.signals[i];
                if ((signal.asserter    == SD.master) ||
                    (signal.destination == SD.master) ||
                    (signal.destination == SD.all)    ||
                    (signal.destination == undefined)
                ) {
                    instance += `.${signal.name}(${instanceID}_${signal.name}), `;
                }
            }
        }

        instance = instance.slice(0, -2) + ");"

        return instance;
    }

    constructor(owner: string, id: string, type: string, affinity: Affinity, rtl: string, baseAddress: number, section: string, configuration: Object, parentBus: Bus, bus: Bus, busConfiguration: Object, bridgedIPs: IP[]) {
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
        this.busConfiguration = busConfiguration;
        this.bridgedIPs = bridgedIPs;

        this.sd = (this.isMaster()) ? SD.master : SD.slave;
    }

    static fromObject(object: Object, parentBus: Bus): IP {
        var newIP = new IP(null, null, null, null, null, null, null, null, null, null, null, null);

        newIP.owner = <string>object["owner"];
        newIP.id = <string>object["id"];
        newIP.type = <string>object["type"];
        newIP.affinity = Affinity[<string>object["affinity"]];
        newIP.rtl = <string>object["rtl"];
        newIP.baseAddress = <number>object["baseAddress"];
        newIP.section = <string>object["section"];
        newIP.configuration = <Object>object["configuration"];
        newIP.parentBus = parentBus
        newIP.sd = (newIP.isMaster()) ? SD.master: SD.slave;
        

        if (newIP.type == "BRDG") {
            newIP.bus = Bus.getByName(<string>object["bus"]);
            newIP.bridgedIPs = []

            var ipList = <Object[]>object["bridgedIPs"];
            for (var i = 0; i <= ipList.length; i += 1) {
                if (ipList[i] !== undefined) {
                    newIP.bridgedIPs.push(IP.fromObject(ipList[i], newIP.bus));
                }
            }
        }

        return newIP;
    }

    static ipsToVerilog(ips: IP[], bus: Bus, busConfiguration: Object, prefix: string): string {
        var verilog = "";
        var width = (busConfiguration && busConfiguration["width"]) ? busConfiguration["width"] : bus.defaultBits;
        if (bus.multiplexed) {
            for (var i in bus.signals) {
                var signal = bus.signals[i];
                verilog += `wire ${
                    (signal.width == 1) ? '':
                    `[${Bus.widthGet(signal.width, width)}:0] `
                }${prefix}_${signal.name};`;
                verilog += '\n';
            }
    
            verilog += '\n';
    
            for (var i in ips) {
                var ip = ips[i];
                verilog += ip.toVerilog(`${prefix}_${i}`, prefix);
                verilog += '\n\n';
            }
        }
        else {
            for (var i in bus.signals) {
                var signal = bus.signals[i];
                for (var j in ips) {
                    verilog += `reg ${
                        (signal.width == 1) ? '':
                        `[${Bus.widthGet(signal.width, width)}:0] `
                    }${prefix}_${j}_${signal.name};`;
                    verilog += '\n';
                }
            }

            verilog += '\n';
    
            for (var i in ips) {
                var ip = ips[i];
                verilog += ip.toVerilog(`${prefix}_${i}`, `${prefix}_${i}`);
                verilog += '\n\n';
            }
        }

        return verilog
    }

}

class SoC {
    name: string;
    bus: Bus;
    busConfiguration: Object;
    ips: IP[];

    toVerilog(): string {
        let verilog = `
/*
 * ${this.name}
 * 
 * Generated by the Pollen SoC Generator
 * ${new Date()}
 * /

module ${this.name};

`;
        verilog += IP.ipsToVerilog(this.ips, this.bus, this.busConfiguration, this.name);

        verilog += 'endmodule';
        return verilog
    }

    constructor(name: string, bus: Bus, busConfiguration: Object, ips: IP[]) {
        this.name = name;
        this.bus = bus;
        this.busConfiguration = busConfiguration;
        this.ips = ips;
    }

    static fromObject(object: Object): SoC {
        var newSoC = new SoC(null, null, null, null);

        newSoC.name = <string>object["name"];
        newSoC.bus = Bus.getByName(<string>object["bus"]);
        newSoC.busConfiguration = <Object>object["busConfiguration"];
        newSoC.ips = [];

        var ipList = <Object[]>object["ips"];
        for (var i = 0; i <= ipList.length; i += 1) {
            if (ipList[i] !== undefined) {
                newSoC.ips.push(IP.fromObject(ipList[i], newSoC.bus));
            }
        }

        return newSoC;
    }

}