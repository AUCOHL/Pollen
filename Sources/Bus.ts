/*
    Bus.ts
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

import { Filesystem } from "./Global.js";

enum SD {
    global = 0,
    master,
    slave,
    decoder,
    multiplexer
}

class Assertion {
    static rules = [];
}
Assertion.rules[SD.global] = [SD.master, SD.slave];
Assertion.rules[SD.master] = [SD.slave];
Assertion.rules[SD.slave] = [SD.master];
Assertion.rules[SD.decoder] = [SD.slave];
Assertion.rules[SD.multiplexer] = [SD.master];

class Destination {
    static rules = [];
}
Destination.rules[SD.global] = [SD.slave, SD.master];
Destination.rules[SD.master] = [SD.master];
Destination.rules[SD.slave] = [SD.slave];
Destination.rules[SD.decoder] = [SD.slave];
Destination.rules[SD.multiplexer] = [];


class Signal {
    name: string;
    asserter: SD;
    forwarding: string;
    destination: SD;
    width: number;

    constructor(name: string, asserter: SD, forwarding: string, destination: SD, width: number) {
        this.name = name;
        this.asserter = asserter;
        this.forwarding = forwarding;
        this.destination = destination;
        this.width = width;
    }

    isMultiplexable(): boolean {
        return (this.asserter == SD.slave || this.asserter == SD.decoder);
    }

    onSD(sd: Destination): boolean {
        return (this.asserter === sd) ||
        (this.destination === undefined) && (Assertion.rules[this.asserter].includes(sd)) ||
        (this.destination !== undefined) && (Destination.rules[this.destination].includes(sd));
    }

    static fromObject(object: Object, defaultBits: number): Signal {
        var newSignal = new Signal(null, null, null, null, null);

        newSignal.name = <string>object["name"];
        newSignal.asserter = SD[<string>object["asserter"]];
        newSignal.forwarding = <string>object["forwarding"];
        newSignal.destination = SD[<string>object["destination"]];

        let width = <number>object["width"];
        newSignal.width = width;

        return newSignal;
    }

}

class Bus {
    name: string;
    creator: string;
    creatorID: string;
    multiplexed: boolean;
    defaultBits: number;
    signals: Signal[];
    signalNames: string[];

    constructor(name: string, creator: string, creatorID: string, multiplexed: boolean, defaultBits: number, signals: Signal[]) {
        this.name = name;
        this.creator = creator;
        this.multiplexed = multiplexed;
        this.defaultBits = defaultBits;
        this.signals = signals;
        this.signalNames = (this.signals == null) ?
            null :
            this.signals.map(signal => signal.name);
    }

    static fromObject(object: Object): Bus {
        var newBus = new Bus(null, null, null, null, null, null);

        newBus.name = <string>object["name"];
        newBus.creator = <string>object["creator"];
        newBus.creatorID = <string>object["creatorID"];
        newBus.multiplexed = <boolean>object["multiplexed"];
        newBus.defaultBits = <number>object["defaultBits"];
        newBus.signals = [];

        var signalList = <Object[]>object["signals"];
        for (var i = 0; i < signalList.length; i += 1) {
            var signal = Signal.fromObject(signalList[i], newBus.defaultBits);
            newBus.signals.push(signal);
        }
        newBus.signalNames = newBus.signals.map(signal => signal.name);

        return newBus;
    }

    static buses: Object = {};
    static getByName(name: string): Bus {
        if (this.buses[name] === undefined) {
            var busString = Filesystem.readFileSync(`./Buses/${name}/manifest.json`).toString();
            var busObject = JSON.parse(busString);
            this.buses[name] = Bus.fromObject(busObject);
        }
        return this.buses[name];
    }

    static widthGet(signal: number, def: number): number {
        return (signal !== -1)? signal: def;
    }
}

export { SD, Assertion, Destination, Signal, Bus };