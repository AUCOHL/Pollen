var globalInfo = {
    rtlLocation: "./Samples"
};

var Filesystem = require('fs');

interface Language {
    net(type: string, signalWidth: number, width: number, name: string): string;
    fromIP(ip: IP, ports: Object[], prefix: string): string;
    fromIPs(ports: Object[], ips: IP[], bus: Bus, busConfiguration: Object, prefix: string): string;
    fromSoC(soc: SoC): string;
    extractPorts(sourceModule: string, rtl: string, cb: any): any[];
};