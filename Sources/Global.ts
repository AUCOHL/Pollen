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