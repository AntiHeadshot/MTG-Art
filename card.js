let openedCard;
let popupWindow;
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

async function delayScryfallCall() {
    if (delayScryfallCall.lastCall) {
        const now = Date.now();
        const timeSinceLastCall = now - delayScryfallCall.lastCall;
        if (timeSinceLastCall < 100) {
            await new Promise(resolve => setTimeout(resolve, 100 - timeSinceLastCall));
        }
    }
    delayScryfallCall.lastCall = Date.now();
}

const eventListeners = {};

function onCardChanged(callback) {
    if (!eventListeners.cardChanged) {
        eventListeners.cardChanged = [];
    }
    eventListeners.cardChanged.push(callback);
}

function triggerCardChanged(card) {
    if (eventListeners.cardChanged) {
        eventListeners.cardChanged.forEach(callback => callback(card));
    }
}

class Card {
    constructor(count, format, set, nr, name, cardId, oracleId, imageUri) {
        cardCnt++;
        this.count = count;
        this.format = format;
        this.set = set;
        this.nr = nr;
        this.name = name;
        this.cardId = cardId;
        this.oracleId = oracleId;
        this.imageUri = imageUri;
        this.isBasicLand = false;
        this.highResImageUris = [];
    }

    static getOpenedCard() { return openedCard; }
    static focusPopupWindow() { popupWindow?.focus(); }

    getDescription() {
        switch (this.format) {
            case Format.MTGPRINT:
                if (this.isUndefined && (!this.nr))
                    return `${this.count} ${this.name}`;
                return `${this.count} ${this.name} (${this.set.toUpperCase()}) ${this.nr}`;
            case Format.SCRYFALL:
                return `${this.count} ${this.scryfall_uri}`;
            default:
                if (this.isUndefined && (!this.nr))
                    return `${this.count} ${this.name}`;
                return `${this.count} [${this.set.toUpperCase()}#${this.nr}] ${this.name}`;
        }
    }

    static async parseCardText(cardText) {
        // Example cardText: "1 [CMR#656] Vampiric Tutor"
        const regexDeckstats = /^(?<count>\d+)\s+\[(?<set>\w+)#(?<nr>[\w-★]+)\]\s+.+$/;
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

        const { count, set, nr } = match.groups;

        var card = new Card(parseInt(count, 10), format);
        await card.updateBySetNr(set, nr);
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
    async update(isRevert, cardId, set, nr) {
        set = set?.toUpperCase();

        if (set) {
            if (this.set === set && this.nr === nr) {
                if (this.history?.length && this.history[this.history.length - 1].isUndefined) {
                    this.history.pop();
                    this.history.push({ set: this.set, nr: this.nr, isUndefined: false });
                }
                return;
            }
        }
        else if (this.cardId === cardId)
            return;

        const now = Date.now();
        let url;

        this.startUpdate();

        if (!this.history)
            this.history = [];

        if (!isRevert) {
            this.future = [];
            if (this.set && this.nr)
                this.history.push({ set: this.set, nr: this.nr, isUndefined: this.isUndefined });
        }

        try {
            if (nr) {
                url = `https://api.scryfall.com/cards/${set}/${nr}`;
                const cacheKey = `card_${set}_${nr}`;
                const cachedCard = localStorage.getItem(cacheKey);

                if (cachedCard) {
                    const cachedData = JSON.parse(cachedCard);
                    this.applyCardData(cachedData.data);
                    return;
                }
            }
            else {
                url = `https://api.scryfall.com/cards/${cardId}`;
            }

            try {
                await delayScryfallCall();
                const response = await fetch(url);
                if (response.status == 200) {
                    const data = await response.json();
                    this.applyCardData(data);
                    const cacheKey = `card_${this.set}_${this.nr}`;
                    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, data }));
                } else {
                    this.isUndefined = true;
                    this.set = set;
                    this.nr = nr;
                    this.imageUri = "img/undefinedCard.svg";
                    this.name = "undefined";
                    this.updateElem();
                }
            } catch (error) {
                console.error("Error updating card:", error);
            }
        } finally {
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
        const now = Date.now();
        let url;

        url = set ? `https://api.scryfall.com/cards/search?order=name&q=${encodeURIComponent(`!"${name}" (set:${set} or set:t${set}) -is:art_series`)}&include_extras=true` :
            `https://api.scryfall.com/cards/search?order=name&q=${encodeURIComponent(`!"${name}" -is:art_series`)}&include_extras=true`;
        try {
            const cacheSearchKey = set ? `card_${name}_${set}` : `card_${name}`;
            const cachedCard = localStorage.getItem(cacheSearchKey);

            this.searchName = name;

            if (cachedCard) {
                const cachedData = JSON.parse(cachedCard);
                await this.updateBySetNr(cachedData.set, cachedData.nr);
                this.isUndefined = cachedData.isUndefined;
                return;
            }

            await delayScryfallCall();

            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();

                if (data.total_cards < 1) {
                    console.log(data);
                    return;
                }

                this.isUndefined = data.total_cards > 1;
                this.applyCardData(data.data[0]);

                localStorage.setItem(cacheSearchKey, JSON.stringify({ timestamp: now, set: this.set, nr: this.nr, isUndefined: this.isUndefined }));
                localStorage.setItem(`card_${this.set}_${this.nr}`, JSON.stringify({ timestamp: now, data: data.data[0] }));
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
            this.imageUri = data.image_uris.normal;
            this.highResImageUris.push(data.image_uris.large);
        }
        this.set = data.set.toUpperCase();
        this.nr = data.collector_number;
        this.name = data.name;
        this.scryfall_uri = data.scryfall_uri;
        this.isBasicLand = data.type_line.startsWith("Basic Land ");
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
        else
            this.elem.classList.remove("twoFaced");

        this.elem.classList.toggle("revertable", this.history?.length > 0);
        this.elem.classList.toggle("forwardable", this.future?.length > 0);

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
        if (!this.history?.length)
            return;

        if (!this.future)
            this.future = [];

        const lastState = this.history.pop();
        this.future.push({ set: this.set, nr: this.nr, isUndefined: this.isUndefined });
        this.updateBySetNr(lastState.set, lastState.nr, true);
        this.isUndefined = lastState.isUndefined;

        this.elem.classList.toggle("revertable", this.history?.length > 0);
        this.elem.classList.add("forwardable");

        triggerCardChanged(this);
    }

    forward() {
        if (!this.future?.length)
            return;

        if (!this.history)
            this.history = [];

        const nextState = this.future.pop();
        this.history.push({ set: this.set, nr: this.nr, isUndefined: this.isUndefined });
        this.updateBySetNr(nextState.set, nextState.nr, true);
        this.isUndefined = nextState.isUndefined;

        this.elem.classList.add("revertable");
        this.elem.classList.toggle("forwardable", this.future?.length > 0);

        triggerCardChanged(this);
    }

    openScryfall(evt, searchOptions, position) {
        var oracleId = this.oracleId;

        var querryParameters = "&unique=prints&as=grid&order=released";
        var searchParameter = "";

        if (searchOptions.isExtendedArt && searchOptions.isFullArt)
            searchParameter += " (is:extendedart or is:full)";
        else if (searchOptions.isExtendedArt)
            searchParameter += " is:extendedart";
        else if (searchOptions.isFullArt)
            searchParameter += " is:full";

        if (searchOptions.frames.length) {
            if (searchOptions.frames.length == 1)
                searchParameter += " frame:" + searchOptions.frames[0];
            else
                searchParameter += ` (${searchOptions.frames.map(f => `frame:${f}`).join(' or ')})`;
        }

        var src = this.isUndefined ?
            `https://scryfall.com/search?order=name&q=${encodeURIComponent(`!"${this.searchName}" -is:art_series`)}&include_extras=true` :
            `https://scryfall.com/search?q=oracleid%3A${oracleId}`;

        src += encodeURIComponent(searchParameter) + querryParameters;

        if (openedCard != null)
            openedCard.elem.classList.remove("selected");
        openedCard = this;
        openedCard.elem.classList.add("selected");

        clearInterval(timer);
        if (popupWindow && !popupWindow.closed) {
            popupWindow.location = src;
            popupWindow.focus();
        } else {
            var dx = evt.screenX - evt.clientX;
            var dy = evt.screenY - evt.clientY;

            popupWindow = window.open(src, "_blank", `popup=true,` +
                `width=${position.width},` +
                `height=${position.height},` +
                `left=${position.left + dx},` +
                `top=${position.top + dy}`);
        }

        var timer = setInterval(function () {
            if (popupWindow.closed) {
                clearInterval(timer);
                openedCard?.elem?.classList?.remove("selected");
                openedCard = null;
            }
        }, 500);
    }
}

export {Card, Format, Frame, onCardChanged};
export default Card;