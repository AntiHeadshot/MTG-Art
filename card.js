import Events from "./events.js";
import Scryfall from "./scryfall.js";

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

let openedCard;
Events.on(Events.Type.ScryfallClosed, () => {
    openedCard?.elem?.classList?.remove("selected");
    openedCard = null;
});

let neededTokens = [];

let cards = [];

class Card {
    constructor(count, format, set, nr, name, cardId, oracleId, imageUri) {
        cardCnt++;
        this.count = count;
        this.format = format;
        this.set = set;
        this.nr = nr;
        this.name = name;
        this.cardId = cardId;
        this.isToken = false;
        this.oracleId = oracleId;
        this.imageUri = imageUri;
        this.isBasicLand = false;
        this.highResImageUris = [];
        this.history = [];
        this.future = [];

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
            case Format.MTGPRINT:
                if (this.isUndefined && (!this.nr))
                    return `${this.count} ${this.name}`;
                if (this.isUndefined)
                    return `${this.count} ${this.searchName} (${this.set.toUpperCase()}) ${this.nr}`;
                return `${this.count} ${this.name} (${this.set.toUpperCase()}) ${this.nr}`;
            case Format.SCRYFALL:
                return `${this.count} ${this.scryfall_uri}`;
            default:
                if (this.isUndefined && (!this.nr))
                    return `${this.count} ${this.name}`;
                if (this.isUndefined)
                    return `${this.count} [${this.set.toUpperCase()}#${this.nr}] ${this.searchName}`;
                return `${this.count} [${this.set.toUpperCase()}#${this.nr}] ${this.name}`;
        }
    }

    static async parseCardText(cardText) {
        // Example cardText: "1 [CMR#656] Vampiric Tutor"
        const regexDeckstats = /^(?<count>\d+)\s+\[(?<set>\w+)#(?<nr>[\w-★]+)\]\s+(?<name>.+)$/;
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
            const regexScryfall = /^(?<count>\d+)\s+(https:\/\/scryfall\.com\/card\/(?<set>\w+)\/(?<nr>[\w\-★]+)\/[\w\-%()\/]+)/;
            format = Format.SCRYFALL;
            match = cardText.match(regexScryfall);
        }

        //Search for card
        if (!match) {
            // Example cardText: "1 [CMR] Vampiric Tutor"
            const regexDeckstats = /^(?<count>\d+)\s+\[(?<set>\w+)\]\s+(?<name>.+)$/;
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

            const { count, name, set } = match.groups;

            var card = new Card(parseInt(count, 10), format);
            await card.searchByName(name, set);
            return card;
        }

        if (!match) {
            throw new Error("Invalid card text format");
        }

        const { count, set, nr, name } = match.groups;

        var card = new Card(parseInt(count, 10), format);
        await card.update(false, null, set, nr, name);
        if (card.isUndefined === undefined)
            card.isUndefined = false;
        return card;
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
                this.imageUri = "img/undefinedCard.svg";
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
                this.imageUri = "img/undefinedCard.svg";
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
        this.oracleId = data.oracle_id;
        this.highResImageUris = [];
        if (!data.image_uris) {
            this.twoFaced = true;
            this.imageUris = [data.card_faces[0].image_uris.normal, data.card_faces[1].image_uris.normal];
            this.imageUri = this.imageUris[0];
            this.highResImageUris.push(data.card_faces[0].image_uris.large);
            this.highResImageUris.push(data.card_faces[1].image_uris.large);
        } else {
            this.twoFaced = false;
            this.imageUri = data.image_uris.normal;
            this.imageUris = [];
            this.highResImageUris.push(data.image_uris.large);
        }
        this.set = data.set.toUpperCase();
        this.nr = data.collector_number;
        this.name = data.name;
        this.scryfall_uri = data.scryfall_uri;
        this.isBasicLand = data.type_line.startsWith("Basic Land ");
        this.isToken = data.type_line.startsWith("Token");
        if (!this.isToken && data.all_parts)
            data.all_parts.filter(p => p.type_line.startsWith("Token")).forEach(t => neededTokens.push({ card: this, tokenId: t.id }));

        this.updateElem();
    }

    updateElem() {
        if (this.elem == null)
            return;

        this.elem.querySelector(".cardImg").src = this.imageUri;

        if (this.twoFaced) {
            this.elem.classList.add("twoFaced");
            this.elem.querySelector(".cardFlipImg").src = this.imageUris[1];
        }
        else {
            this.elem.classList.remove("twoFaced");
            this.elem.classList.remove("flipped");
        }

        this.elem.classList.toggle("revertable", this.history.length > 0);
        this.elem.classList.toggle("forwardable", this.future.length > 0);

        this.elem.id = "card" + this.order;

        if (!this.elem.style.zIndex)
            this.elem.style.zIndex = 9000 - this.order;

        this.elem.style.top = `${this.order * 2 + 4}px`;
        this.elem.style.bottom = `${Math.max(0, cardCnt - this.order) * 2 + 4}px`;
        this.elem.style.transition = `bottom 1s ease-in-out`;

        if (!this.elem.style.transform) {
            this.rotation = (Math.random() - 0.5) * 2 * 2;
            this.elem.style.transform = `rotate(${this.rotation}deg)`;
        }

        new IntersectionObserver(entries => {
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
        }).observe(this.elem);
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

    openScryfall(evt, searchOptions, position) {

        if (openedCard != null)
            openedCard.elem.classList.remove("selected");
        openedCard = this;
        openedCard.elem.classList.add("selected");

        Scryfall.open(evt, searchOptions, position, this);
    }
}

export { Card, Format, Frame };
export default Card;