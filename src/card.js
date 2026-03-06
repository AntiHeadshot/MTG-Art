import Events from "./events.js";
import Scryfall from "./scryfall.js";
import Mana from "./mana.js";

let cardCnt = 0;

const Format = Object.freeze({
    DECKSTATS: 'deckstats',
    MTGPRINT: 'mtgprint',
    SCRYFALL: 'scryfall',
});

const Frame = Object.freeze({
    _1993: '1993',
    _1997: '1997',
    _2003: '2003',
    _2015: '2015',
    FUTURE: 'future',
});

const Print = Object.freeze({
    FRONT: 'FRONT',
    BACK: 'BACK',
});

let openedCard;
Events.on(Events.Type.ScryfallClosed, () => {
    openedCard?.elem?.classList?.remove("selected");
    openedCard = null;
});

let neededTokens = [];

let cards = [];

class Card {
    constructor(text, elem, entryElem) {
        cardCnt++;
        this.elem = elem;
        this.entryElem = entryElem;

        this.count = 0;
        this.format = null;
        this.isToken = false;
        this.isUnset = true;
        this.text = text;

        this.isBasicLand = false;
        this.imageUris = [];
        this.highResImageUris = [];
        this.imageElements = [];
        this.history = [];
        this.future = [];
        this.printOptions = [Print.FRONT, Print.BACK];
        this.printSettings = { brightness: 100 };
        this.identity = [];

        cards.push(this);
    }

    static async handleTokens() {
        let missing = [];

        for (let tokenId of new Set(neededTokens.map(t => t.tokenId))) {
            if (!cards.find(c => c.cardId == tokenId)) {
                let card = await Scryfall.get(tokenId);
                if (!cards.find(c => c.oracleId == card.oracle_id)) {
                    let missingToken = missing.find(t => t.card.oracle_id == card.oracle_id)
                    if (missingToken) {
                        missingToken.requiredBy.push(...neededTokens.filter(t => t.tokenId == tokenId).map(t => t.card));
                    } else
                        missing.push({ card, requiredBy: neededTokens.filter(t => t.tokenId == tokenId).map(t => t.card) });
                }
            }
        }

        let undefs = cards.filter(c => c.isUndefined && c.isToken);

        for (let token of missing) {
            let card = undefs.find(c => c.name == token.card.name);
            if (card) {
                card.updateBySetNr(token.card.set, token.card.collector_number, false);
                card.isUndefined = false;
                undefs = undefs.filter(c => c != card);
                missing = missing.filter(t => t != token);
            }
        }

        return missing;
    }

    static getOpenedCard() { return openedCard; }

    getDescription() {
        switch (this.format) {
            case null:
                return this.text;
            case Format.MTGPRINT:
                if (this.isUndefined && (!this.nr))
                    return `${this.count} ${this.name}`;
                if (this.isUndefined)
                    return `${this.count} ${this.searchName} (${this.set.toUpperCase()}) ${this.nr}`;
                return `${this.count} ${this.name} (${this.set.toUpperCase()}) ${this.nr}`;
            case Format.SCRYFALL:
                return `${this.count} ${this.scryfall_uri}`;
            case Format.DECKSTATS:
            default:
                var settings = [];
                if (!this.printOptions.includes(Print.FRONT))
                    settings.push("donotprintfront");
                if (!this.printOptions.includes(Print.BACK))
                    settings.push("donotprintback");
                if (this.printSettings) {
                    if (this.printSettings.brightness != 100)
                        settings.push(`brightness:${this.printSettings.brightness.toFixed()}`);
                }

                if (this.isUndefined && (!this.nr))
                    return `${this.count} ${this.name}`;
                if (this.isUndefined)
                    return `${this.count} [${this.set.toUpperCase()}#${this.nr}] ${this.searchName}${settings.length ? " #" + settings.join(" ") : ""}`;
                return `${this.count} [${this.set.toUpperCase()}#${this.nr}] ${this.name}${settings.length ? " #" + settings.join(" ") : ""}`;
        }
    }

    static parseCardText(cardText, elem, entryElem) {
        var card = new Card(cardText, elem, entryElem);
        var returnValue = { card: card };

        returnValue.load = new Promise(async (resolve) => {
            // Example cardText: "1 [CMR#656] Vampiric Tutor"
            const regexDeckstats = /^(?<count>\d+)\s+\[(?<set>\w+)#(?<nr>[\w-★]+)\](\s+(?<name>[^#]+))?(#(?<parameters>([^ ]+)( ([^ ]+))*))?$/;
            let match = cardText.match(regexDeckstats);
            let format = Format.DECKSTATS;

            if (!match) {
                // Example cardText: "1 Legion's Landing // Adanto, the First Fort (PXTC) 22"
                const regexMtgPrint = /^(?<count>\d+)\s+(?<name>.+)\s\((?<set>\w+)\)\s+(?<nr>[\w-★]+)$/;
                format = Format.MTGPRINT;
                match = cardText.match(regexMtgPrint);
            }
            if (!match) {
                // Example cardText: "1 https://scryfall.com/card/cmr/656/vampiric-tutor"
                const regexScryfall = /^(?<count>\d+)\s+(https:\/\/scryfall\.com\/card\/(?<set>\w+)\/(?<nr>[\w\-★]+)\/[\w\-%()/]+)/;
                format = Format.SCRYFALL;
                match = cardText.match(regexScryfall);
            }

            //Search for card
            if (!match) {
                // Example cardText: "1 [CMR] Vampiric Tutor"
                const regexDeckstats = /^(?<count>\d+)\s+\[(?<set>\w+)\](\s+(?<name>.+))?$/;
                let match = cardText.match(regexDeckstats);
                let format = Format.DECKSTATS;

                if (!match) {
                    // Example cardText: "1 Legion's Landing // Adanto, the First Fort (PXTC)"
                    const regexMtgPrint = /^(?<count>\d+)\s+(?<name>.+)\s\((?<set>\w+)\)\s+$/;
                    format = Format.MTGPRINT;
                    match = cardText.match(regexMtgPrint);
                }

                if (!match) {
                    // Example cardText: "1 Vampiric Tutor"
                    const regexUndefined = /^(?<count>\d+)\s+(?<name>.+)$/;
                    format = Format.DECKSTATS;
                    match = cardText.match(regexUndefined);
                }

                if (!match) {
                    card.count = 1;
                    card.format = Format.DECKSTATS;
                    await card.searchByName(cardText, null);
                    resolve(card);
                    return;
                }

                const { count, name, set } = match.groups;

                card.count = parseInt(count, 10)
                card.format = format;
                await card.searchByName(name, set);
                resolve(card);
                return;
            }

            if (!match) {
                throw new Error("Invalid card text format");
            }

            const { count, set, nr, name, parameters } = match.groups;

            card.count = parseInt(count, 10)
            card.format = format;
            if (parameters) {
                let params = parameters.split(" ").map(p => p.trim().toLowerCase());
                if (params.includes("donotprintfront"))
                    card.printOptions = card.printOptions.filter(p => p != Print.FRONT);
                if (params.includes("donotprintback"))
                    card.printOptions = card.printOptions.filter(p => p != Print.BACK);
                const brightMatch = params.find(p => p.startsWith("brightness:"))?.match(/brightness:(\d+)/);
                if (brightMatch)
                    card.printSettings.brightness = Number(brightMatch[1]);

            }
            await card.update(false, null, set, nr, name);
            if (card.isUndefined === undefined)
                card.isUndefined = false;
            resolve(card);
        });
        return returnValue;
    }

    async updateById(cardId) {
        await this.update(false, cardId, undefined, undefined);
    }
    async updateBySetNr(set, nr, isRevert) {
        await this.update(isRevert || false, undefined, set, nr);
    }
    async update(isRevert, cardId, set, nr, name) {
        set = set?.toUpperCase();

        if (set) {
            if (this.set === set && this.nr === nr) {
                if (this.history.length && this.history[this.history.length - 1].isUndefined) {
                    this.history.pop();
                    this.history.push({ set: this.set, nr: this.nr, isUndefined: false });
                }
                return;
            }
        }
        else if (this.cardId === cardId)
            return;

        this.startUpdate();

        if (!isRevert) {
            this.future = [];
            if (this.set && this.nr)
                this.history.push({ set: this.set, nr: this.nr, isUndefined: this.isUndefined });
        }
        try {
            var data = await Scryfall.get(cardId, set, nr);

            if (data)
                this.applyCardData(data);
            else {
                this.isUndefined = true;
                this.set = set;
                this.nr = nr;
                this.imageUris[0] = "img/undefinedCard.svg";
                this.name = "undefined";
                this.searchName = name;
                this.updateElem();
            }

            Events.dispatch(Events.Type.CardChanged, this);
        }
        finally {
            this.endUpdate();
        }
    }

    startUpdate() {
        if (this.elem != null)
            this.elem.classList.add("updating");
    }

    endUpdate() {
        if (this.elem != null)
            this.elem.classList.remove("updating");
    }

    async searchByName(name, set) {
        try {
            this.searchName = name;

            let card = await Scryfall.search(name, set);

            if (card) {
                this.isUndefined = card.isUndefined;
                this.applyCardData(card);
            } else {
                this.imageUris[0] = "img/undefinedCard.svg";
                this.name = name;
                this.isUndefined = true;
                this.updateElem();
            }
        } catch (error) {
            console.error("Error updating card:", error);
        }
    }

    applyCardData(data) {
        this.cardId = data.id;
        this.oracleId = data.oracle_id ?? data.card_faces?.[0]?.oracle_id ?? data.card_faces?.[1]?.oracle_id;
        this.highResImageUris = [];
        if (!data.image_uris) {
            this.twoFaced = true;
            this.imageUris = [data.card_faces[0].image_uris.normal, data.card_faces[1].image_uris.normal];
            this.highResImageUris.push(data.card_faces[0].image_uris.large);
            this.highResImageUris.push(data.card_faces[1].image_uris.large);
        } else {
            this.twoFaced = false;
            this.imageUris = [data.image_uris.normal];
            this.highResImageUris.push(data.image_uris.large);
        }
        this.set = data.set.toUpperCase();
        this.nr = data.collector_number;
        this.name = data.name;
        this.cardTitle = data.card_faces?.[0]?.name ?? data.name;
        this.mana = data.mana_cost ?? data.card_faces?.[0]?.mana_cost;
        this.identity = data.color_identity;
        this.scryfall_uri = data.scryfall_uri;
        this.isBasicLand = data.type_line?.startsWith("Basic Land ") ?? false;
        this.isToken = data.type_line?.startsWith("Token") ?? false;
        if (!this.isToken && data.all_parts)
            data.all_parts.filter(p => p.type_line.startsWith("Token")).forEach(t => neededTokens.push({ card: this, tokenId: t.id }));

        this.isUnset = false;

        this.updateElem();
    }

    addImageElem(elem) {
        this.imageElements.push(elem);
    }

    updateElem() {
        this.elem.style.display = "block";
        this.entryElem.style.display = "block";

        this.elem.querySelector(".cardImg").src = this.imageUris[0];
        this.elem.querySelector(".cardImg").style.filter = `brightness(${this.printSettings?.brightness ?? 100}%)`;

        if (this.twoFaced) {
            this.elem.classList.add("twoFaced");
            this.elem.querySelector(".cardFlipImg").src = this.imageUris[1];
            this.elem.querySelector(".cardFlipImg").style.filter = `brightness(${this.printSettings?.brightness ?? 100}%)`;
        }
        else {
            this.elem.classList.remove("twoFaced");
            this.elem.classList.remove("flipped");
        }

        this.imageElements = this.imageElements.filter(x => x.isConnected);
        for (let img of this.imageElements)
            img.style.filter = `brightness(${this.printSettings?.brightness ?? 100}%)`;

        this.elem.classList.toggle("revertable", this.history.length > 0);
        this.elem.classList.toggle("forwardable", this.future.length > 0);

        this.elem.id = "card" + this.order;

        if (this.printOptions.includes(Print.FRONT)) {
            this.elem.querySelector(".printSettings .printFrontSvg").classList.add("selected");
            this.elem.querySelector(".cardImg").classList.remove("grayed");

        } else {
            this.elem.querySelector(".printSettings .printFrontSvg").classList.remove("selected");
            this.elem.querySelector(".cardImg").classList.add("grayed");
        }

        if (this.printOptions.includes(Print.BACK)) {
            this.elem.querySelector(".printSettings .printBackSvg").classList.add("selected");
            this.elem.querySelector(".cardFlipImg").classList.remove("grayed");
        } else {
            this.elem.querySelector(".printSettings .printBackSvg").classList.remove("selected");
            this.elem.querySelector(".cardFlipImg").classList.add("grayed");
        }

        if (!this.elem.style.zIndex)
            this.elem.style.zIndex = 9000 - this.order;

        this.elem.style.top = `${this.order * 2 + 4}px`;
        this.elem.style.bottom = `${Math.max(0, cardCnt - this.order) * 2 + 4}px`;
        this.elem.style.transition = `bottom 1s ease-in-out`;

        if (!this.elem.style.transform) {
            this.rotation = (Math.random() - 0.5) * 2 * 2;
            this.elem.style.transform = `rotate(${this.rotation}deg)`;
        }

        if (this.observer)
            this.observer.disconnect();
        this.observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.zIndex = 9000 - entry.target.card.order;
                } else {
                    entry.target.style.zIndex = 1000;
                }
            });
        }, {
            root: document,
            rootMargin: `-${this.order * 2 + 5}px 0px 0px 0px`,
            threshold: 1
        });
        this.observer.observe(this.elem);


        this.entryElem.classList.toggle("unset", this.isUnset);

        if (this.identity)
            this.entryElem.querySelector("#cardHeader").classList.add("identity" + this.identity.join(""));

        this.entryElem.querySelector("#input").value = this.getDescription();
        this.entryElem.querySelector("#name").innerHTML = this.cardTitle;
        this.entryElem.querySelector("#count").innerHTML = this.count;
        const manacostElem = this.entryElem.querySelector("#manacost");
        while (manacostElem.firstChild)
            manacostElem.removeChild(manacostElem.firstChild);

        for (let mana of Mana.getMana(this.mana))
            manacostElem.appendChild(mana);
    }

    rollback() {
        if (!this.history.length)
            return;

        const lastState = this.history.pop();
        this.future.push({ set: this.set, nr: this.nr, isUndefined: this.isUndefined });
        this.updateBySetNr(lastState.set, lastState.nr, true);
        this.isUndefined = lastState.isUndefined;

        this.elem.classList.toggle("revertable", this.history.length > 0);
        this.elem.classList.add("forwardable");

        Events.dispatch(Events.Type.CardChanged, this);
    }

    forward() {
        if (!this.future.length)
            return;

        const nextState = this.future.pop();
        this.history.push({ set: this.set, nr: this.nr, isUndefined: this.isUndefined });
        this.updateBySetNr(nextState.set, nextState.nr, true);
        this.isUndefined = nextState.isUndefined;

        this.elem.classList.add("revertable");
        this.elem.classList.toggle("forwardable", this.future.length > 0);

        Events.dispatch(Events.Type.CardChanged, this);
    }

    selectPrint(printType) {
        if (this.printOptions.includes(printType))
            this.printOptions = this.printOptions.filter(f => f !== printType);
        else
            this.printOptions.push(printType);

        this.updateElem();
        Events.dispatch(Events.Type.CardChanged, this);
    }

    openScryfall(evt, searchOptions, position) {

        if (openedCard != null)
            openedCard.elem.classList.remove("selected");
        openedCard = this;
        openedCard.elem.classList.add("selected");

        Scryfall.open(evt, searchOptions, position, this);
    }

    updated() {
        this.updateElem();
        Events.dispatch(Events.Type.CardChanged, this);
    }
}

export { Card, Format, Frame, Print };
export default Card;