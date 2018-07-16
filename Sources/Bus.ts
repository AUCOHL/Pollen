enum SD {
    master = 0,
    slave,
    globalClock,
    globalReset,
    decoder,
    multiplexer,
    all
}

class Signal {
    name: string;
    asserter: SD;
    resetActiveHigh: boolean;
    resetSynchronous: boolean;
    destination: SD;
    width: number;

    constructor(name: string, asserter: SD, asserterName: string, resetActiveHigh: boolean, resetSynchronous: boolean, destination: SD, width: number) {
        this.name = name;
        this.asserter = asserter;
        this.resetActiveHigh = resetActiveHigh;
        this.resetSynchronous = resetSynchronous;
        this.destination = destination;
        this.width = width;
    }

    static fromObject(object: Object, defaultBits: number): Signal {
        var newSignal = new Signal(null, null, null, null, null, null, null);

        newSignal.name = <string>object["name"];
        newSignal.asserter = SD[<string>object["asserter"]];
        newSignal.resetActiveHigh = <boolean>object["resetActiveHigh"];
        newSignal.resetSynchronous = <boolean>object["resetSynchronous"];
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

    constructor(name: string, creator: string, creatorID: string, multiplexed: boolean, defaultBits: number, signals: Signal[]) {
        this.name = name;
        this.creator = creator;
        this.multiplexed = multiplexed;
        this.defaultBits = defaultBits;
        this.signals = signals;
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

        return newBus;
    }

    static buses: Object = {};
    static getByName(name: string): Bus {
        if (this.buses[name] === undefined) {
            var busString = Filesystem.readFileSync(`./Buses/${name}/manifest.json`);
            var busObject = JSON.parse(busString);
            this.buses[name] = Bus.fromObject(busObject);
        }
        return this.buses[name];
    }

    static widthGet(signal: number, def: number): number {
        return (signal !== -1)? (signal - 1) : (def - 1);
    }
}