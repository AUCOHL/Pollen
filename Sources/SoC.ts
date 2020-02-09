/*
    Global.ts
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

import { SD, Bus } from "./Bus.js";
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
    instanceNumber: number;
    ports: Object;

    isMaster(): boolean {
        return (this.baseAddress == null);
    }

    instanceID(prefix: string): string {
        return (this.instanceNumber !== null) ? `${prefix}_${this.id}_${this.instanceNumber}`: `${prefix}_${this.id}`;
    }

    constructor(owner: string, id: string, type: string, affinity: Affinity, rtl: string, baseAddress: number, section: string, configuration: Object, parentBus: Bus, bus: Bus, busConfiguration: Object, bridgedIPs: IP[], instanceNumber: number = null) {
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
        this.instanceNumber = instanceNumber;

        this.sd = (this.isMaster()) ? SD.master : SD.slave;
    }

    static fromObject(object: Object, parentBus: Bus, instanceNumber: number): IP {
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
        newIP.instanceNumber = instanceNumber;
        

        if (newIP.type == "BRDG") {
            newIP.bus = Bus.getByName(<string>object["bus"]);
            newIP.bridgedIPs = []

            var ipList = <Object[]>object["bridgedIPs"];
            for (var i = 0; i <= ipList.length; i += 1) {
                if (ipList[i] !== undefined) {
                    newIP.bridgedIPs.push(IP.fromObject(ipList[i], newIP.bus, i));
                }
            }
        }

        return newIP;
    }

}

class SoC {
    name: string;
    bus: Bus;
    busConfiguration: Object;
    ips: IP[];

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
                newSoC.ips.push(IP.fromObject(ipList[i], newSoC.bus, i));
            }
        }

        return newSoC;
    }

}

export { Affinity, IP, SoC };