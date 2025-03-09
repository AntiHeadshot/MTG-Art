let openedCard;
let popupWindow;
let cards = [];
let cardCnt = 0;
let hoverOn = false;

const Mode = Object.freeze({
    INPUT: 'input',
    ARTVIEW: 'artview',
});

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

let frames = [];

let mode = Mode.INPUT;

let isExtendedArt = false;
let isFullArt = false;

window.Format = Format;
window.Frame = Frame;

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

class Card {
    constructor(count, format, set, nr, name, cardId, oracleId, imageUri) {
        this.count = count;
        this.format = format;
        this.set = set;
        this.nr = nr;
        this.name = name;
        this.cardId = cardId;
        this.oracleId = oracleId;
        this.imageUri = imageUri;
    }

    getDescription() {
        switch (this.format) {
            case Format.MTGPRINT:
                if (this.isUndefined)
                    return `${this.count} ${this.name}`;
                return `${this.count} ${this.name} (${this.set.toUpperCase()}) ${this.nr}`;
            case Format.SCRYFALL:
                return `${this.count} ${this.scryfall_uri}`;
            default:
                if (this.isUndefined)
                    return `${this.count} ${this.name}`;
                return `${this.count} [${this.set.toUpperCase()}#${this.nr}] ${this.name}`;
        }
    }

    static async parseCardText(cardText) {
        // Example cardText: "1 [CMR#656] Vampiric Tutor"
        const regexDeckstats = /^(?<count>\d+)\s+\[(?<set>\w+)#(?<nr>[\w-]+)\]\s+.+$/;
        let match = cardText.match(regexDeckstats);
        let format = Format.DECKSTATS;

        if (!match) {
            // Example cardText: "1 Legion's Landing // Adanto, the First Fort (PXTC) 22"
            const regexMtgPrint = /^(?<count>\d+)\s+(?<name>.+)\s\((?<set>\w+)\)\s+(?<nr>[\w-]+)$/;
            format = Format.MTGPRINT;
            match = cardText.match(regexMtgPrint);
        }
        if (!match) {
            // Example cardText: "1 https://scryfall.com/card/cmr/656/vampiric-tutor"
            const regexScryfall = /^(?<count>\d+)\s+(https:\/\/scryfall\.com\/card\/(?<set>\w+)\/(?<nr>[\w\-%]+)\/[\w\-%()\/]+)/;
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
                const data = await response.json();
                this.applyCardData(data);
                const cacheKey = `card_${this.set}_${this.nr}`;
                localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, data }));
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
                console.log(this);
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
        if (!data.image_uris) {
            this.twoFaced = true;
            this.imageUris = [data.card_faces[0].image_uris.normal, data.card_faces[1].image_uris.normal];
            this.imageUri = this.imageUris[0];
        } else {
            this.imageUri = data.image_uris.normal;
        }
        this.set = data.set.toUpperCase();
        this.nr = data.collector_number;
        this.name = data.name;
        this.scryfall_uri = data.scryfall_uri;
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

        updateList();
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

        updateList();
    }

    openScryfall(evt) {
        var oracleId = this.oracleId;
        var imgsrc = view.display.wrapper.getBoundingClientRect();

        var querryParameters = "&unique=prints&as=grid&order=released";
        var searchParameter = "";

        if (isExtendedArt && isFullArt)
            searchParameter += " (is:extendedart or is:full)";
        else if (isExtendedArt)
            searchParameter += " is:extendedart";
        else if (isFullArt)
            searchParameter += " is:full";

        if (frames.length) {
            if (frames.length == 1)
                searchParameter += " frame:" + frames[0];
            else
                searchParameter += ` (${frames.map(f => `frame:${f}`).join(' or ')})`;
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
                `width=${imgsrc.width},` +
                `height=${imgsrc.height},` +
                `left=${imgsrc.left + dx},` +
                `top=${imgsrc.top + dy}`);
        }

        var timer = setInterval(function () {
            if (popupWindow.closed) {
                clearInterval(timer);
                openedCard?.elem?.classList?.remove("selected");
                openedCard = null;
            }
        }, 500);
    }

    scrollTo(behavior) {
        behavior ||= "smooth";
        if (this.elem) {
            var cardsContainer = document.getElementById("cards");

            if (mode == Mode.INPUT) {
                var adjustedHeight = this.getAdjustedHeight()

                cardsContainer.scrollTo({
                    top: Math.max(0, this.order
                        * (adjustedHeight + 10)
                        - cardsContainer.getBoundingClientRect().height / 2),
                    behavior: behavior,
                });
            } else if (mode == Mode.ARTVIEW) {
                this.elem.scrollIntoView({
                    block: "start",
                    behavior: behavior,
                });
            }
        }
    }

    getAdjustedHeight() {
        var cardRect = this.elem.getBoundingClientRect();
        var cardHeight = cardRect.height;
        var cardWidth = cardRect.width;
        var radians = Math.abs(this.rotation * (Math.PI / 180));

        let sin = Math.sin(radians);
        let cos = Math.cos(radians);

        return (cardWidth * sin - cardHeight * cos)
            / (sin * sin - cos * cos);
    }
}

function updateList() {
    let lastHoverOn = hoverOn;
    hoverOn = false;

    var deckCards = cards.filter(c => c instanceof Card);

    var deck = cards.map(c => c.getDescription ? c.getDescription() : c).join("\n");

    const scrollInfo = view.getScrollInfo();
    view.doc.setValue(deck);
    for (let card of deckCards) {
        if (card.isUndefined)
            view.addLineClass(card.lineNr, "text", "isUndefined");
    }

    view.scrollTo(scrollInfo.left, scrollInfo.top);

    hoverOn = lastHoverOn;

    localStorage.setItem('deck', deck);
}

window.onDrop = async function onDrop(e) {
    e.preventDefault();
    popupWindow.focus();
    print("\ndropped:\n" + e.dataTransfer.getData("text/uri-list"));

    if (openedCard != null) {
        var text = e.dataTransfer.getData("text/uri-list").split("\n");

        if (text && text.length == 1) {
            text = text[0];
            if (/^https:\/\/scryfall\.com\/card\/\w+\/[\w\-%]+\/[\w\-%()\/]+$/.test(text)) {
                const urlParts = text.split('/');

                await openedCard.updateBySetNr(urlParts[4], urlParts[5]);
                openedCard.isUndefined = false;
                updateList();

            } else if (/^https:\/\/cards\.scryfall\.io\/\w+\/\w+\/\w+\/[\w-]+\/[\w-]+\.jpg\?\d+$/.test(text)) {
                const id = text.split('/')[7].split('.')[0];

                await openedCard.updateById(id);
                openedCard.isUndefined = false;
                updateList();
            }
        }
    }
};

window.parseDeck = async function parseDeck() {
    var deckText = view.doc.getValue();

    if (deckText.trim() === "")
        return;

    if (document.getElementById("loadDeck").disabled)
        return;

    document.getElementById("loadDeck").disabled = true;
    document.getElementById("convertToScryfallBtn").disabled = false;
    document.getElementById("convertToMtgPrintBtn").disabled = false;
    document.getElementById("convertToDeckstatsBtn").disabled = false;

    var template = document.getElementById("cardTemplate");
    var parent = document.getElementById("cardContainer");

    while (parent.lastChild && parent.lastChild.style?.display !== "none")
        parent.removeChild(parent.lastChild);

    // Example deck URL: https://deckstats.net/decks/276918/3990370-rawr-from-the-dead
    const deckUrlRegex = /^https:\/\/deckstats\.net\/decks\/(?<userId>\d+)\/(?<deckId>\d+)-/;
    const deckUrlMatch = deckText.match(deckUrlRegex);

    if (deckUrlMatch) {
        const { userId, deckId } = deckUrlMatch.groups;
        let apiUrl = `https://deckstats.net/api.php?action=get_deck&id_type=saved&owner_id=${userId}&id=${deckId}&response_type=json`;
        try {
            const response = await fetch(apiUrl);
            const deckData = await response.json();

            var sets = localStorage.getItem('deckstatSets');

            if (sets)
                sets = JSON.parse(sets);
            else {
                const setsResponse = await fetch('deckstats_sets.json');
                const setsData = await setsResponse.json();
                sets = setsData;
                localStorage.setItem('deckstatSets', JSON.stringify(sets));
            }

            function getCardText(card) {
                if (card.set_id) {
                    if (card.collector_number)
                        return `${card.amount} [${sets[card.set_id].abbreviation}#${card.collector_number}] ${card.name}`;
                    return `${card.amount} [${sets[card.set_id].abbreviation}] ${card.name}`;
                }
                return `${card.amount} ${card.name}`;
            }

            deckText = deckData.sections.map(s => ((s.name && s.name != "Main") ? `\n// ${s.name}\n` : "")
                + s.cards.map(getCardText).join('\n')).join('\n');

            if (deckData?.sideboard?.length > 0) {
                deckText += '\n\n// Sideboard\n';
                deckText += deckData.sideboard.map(getCardText).join('\n');
            }

            if (deckData?.tokens?.length > 0) {
                deckText += '\n\n// Tokens\n';
                deckText += deckData.tokens.map(getCardText).join('\n');
            }

            view.doc.setValue(deckText);
        } catch (error) {
            print("Deck could not be loaded; " + JSON.stringify(error.toString()));
        }
    }

    const deckLines = deckText.split("\n");
    let cardNr = 0;

    for (let i = 0; i < deckLines.length; i++) {
        showToast(`Parsing card ${i + 1} of ${deckLines.length}...`);
        const cardText = deckLines[i];
        if (cardText.trim() === "" || cardText.startsWith("//")) {
            cards.push(cardText);
            continue;
        }

        var card = await Card.parseCardText(cardText);
        card.order = ++cardNr;
        card.lineNr = i;

        var line = view.getLine(i);
        view.replaceRange(card.getDescription() + "✔️", { line: i, ch: 0 }, { line: i, ch: line.length });

        var clone = template.cloneNode(true);
        clone.card = card;
        card.elem = clone;
        card.updateElem();
        clone.style.display = "block";

        insertCardInOrder(parent, card, clone)

        cards.push(card);
        cardCnt++;
    }

    for (const card of cards) {
        if (card instanceof Card) {
            card.updateElem();
        }
    }

    hideToaster();

    updateList();

    hoverOn = true;
    view.on("beforeSelectionChange", scrollToSelectedCard);
}

function insertCardInOrder(parent, card, elem) {
    let inserted = false;
    for (let j = 0; j < parent.children.length; j++) {
        let child = parent.children[j];
        if (child.card?.order > card.order) {
            parent.insertBefore(elem, child);
            inserted = true;
            break;
        }
    }
    if (!inserted) {
        parent.appendChild(elem);
    }
}

window.addEventListener("error", function (event) {
    print(`\nError: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
});

window.addEventListener("unhandledrejection", function (event) {
    print(`\nUnhandled rejection: ${event.reason}`);
});

function print(text) {
    let lastHoverOn = hoverOn;
    hoverOn = false;
    console.log("printing: " + text);
    const scrollInfo = view.getScrollInfo();
    view.doc.setValue(view.doc.getValue() + '\n' + text);
    view.scrollTo(scrollInfo.left, scrollInfo.top);
    hoverOn = lastHoverOn;
}

window.copyToClipboard = async function copyToClipboard() {
    var textToCopy = cards.filter(c => c.scryfall_uri).map(c => `${c.count} ${c.scryfall_uri}`).join("\n");
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast("copied to clipboard");
    } catch (err) {
        console.error('Could not copy text: ', err);
    }
}

window.convertToFormat = function convertToFormat(format) {
    for (const card of cards) {
        if (card instanceof Card)
            card.format = format;
    }

    updateList();
}

let toastTimeout;

function showToast(message) {
    var toaster = document.getElementById('toaster');
    var toasterMessage = document.getElementById('toasterMessage');
    toasterMessage.textContent = message;
    toaster.classList.add("show");

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    toastTimeout = setTimeout(function () {
        toaster.classList.remove("show");
    }, 3000);
}

function hideToaster() {
    document.getElementById('toaster').classList.remove("show");
}

window.highlightDeckInput = function highlightDeckInput(card) {
    const cardText = card.getDescription();

    let lastHoverOn = hoverOn;
    hoverOn = false;
    view.setSelection({ line: card.lineNr, ch: 0 }, { line: card.lineNr, ch: cardText.length });
    hoverOn = lastHoverOn;
}

window.removeHighlightDeckInput = function removeHighlightDeckInput(card) {
    let lastHoverOn = hoverOn;
    hoverOn = false;
    view.setSelection({ line: card.lineNr, ch: 0 });
    hoverOn = lastHoverOn;
}

window.swapMode = function swapMode() {
    let selectedCard;
    switch (mode) {
        case Mode.ARTVIEW:
            selectedCard = cards.filter(c => c.elem).find(c => c.elem.getBoundingClientRect().top > 0);

            document.body.classList.remove('artView');
            mode = Mode.INPUT;
            break;
        case Mode.INPUT:
            selectedCard = cards.filter(c => c.elem).find(c => {
                let rect = c.elem.getBoundingClientRect();
                return rect.top <= (window.innerHeight / 2 + 10) && rect.bottom >= (window.innerHeight / 2 - 10);
            });

            document.body.classList.add('artView');
            mode = Mode.ARTVIEW;
            break;
    }

    selectedCard?.scrollTo("instant");
};

var allArtElem = document.getElementById("allArt");
var extendedArtElem = document.getElementById("extendedArt");
var fullArtElem = document.getElementById("fullArt");

window.selectAllArt = function selectAllArt() {
    var value = !(isFullArt || isExtendedArt)
    isFullArt = value;
    isExtendedArt = value;

    updateArtButtons();
    openedCard?.openScryfall();
}

window.selectExtendedArt = function selectWideArt() {
    isExtendedArt = !isExtendedArt;

    updateArtButtons();
    openedCard?.openScryfall();
}

window.selectFullArt = function selectFullArt() {
    isFullArt = !isFullArt;

    updateArtButtons();
    openedCard?.openScryfall();
}

window.selectFrameType = function selectFrameType(elem, frameType) {
    if (frames.includes(frameType)) {
        frames = frames.filter(f => f !== frameType);
        elem.classList.remove("selected");
    } else {
        frames.push(frameType);
        elem.classList.add("selected");
    }

    openedCard?.openScryfall();
}

function updateArtButtons() {

    fullArtElem.classList.toggle("selected", isFullArt);
    extendedArtElem.classList.toggle("selected", isExtendedArt);
    allArtElem.classList.toggle("selected", !(isFullArt || isExtendedArt));
}

function cleanUpLocalStorage() {
    const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000;
    const threeDaysAgo = Date.now() - threeDaysInMillis;

    for (const key in localStorage) {
        if (key.startsWith('card_')) {
            const cachedCard = JSON.parse(localStorage.getItem(key));
            if (cachedCard.timestamp < threeDaysAgo) {
                localStorage.removeItem(key);
            }
        }
    }

    let version = localStorage.getItem("version");
    if (!version) {
        for (const key in localStorage) {
            if (key.startsWith('card_')) {
                localStorage.removeItem(key);
            }
        }
    } else {
        version = parseFloat(version, 10);
        if (version < 2) {
            for (const key in localStorage) {
                if (key.startsWith('card_')) {
                    localStorage.removeItem(key);
                }
            }
        }
    }

    localStorage.setItem("version", 2);
}

cleanUpLocalStorage();

let view = CodeMirror.fromTextArea(document.getElementById("deckInput"));
view.doc.setValue(localStorage.getItem("deck") ?? await(await fetch('placeholder.txt')).text());

console.log(view);

async function scrollToSelectedCard(_, obj) {
    if (hoverOn && cards?.length > 0) {
        const line = Math.min(obj.ranges[0].anchor.line, obj.ranges[0].head.line);
        let closestCard = cards.find(card => card.lineNr >= line) || cards[cards.length - 1];
        closestCard.scrollTo();
    }
}

for (let elem of document.querySelectorAll("replacedSvg")) {
    var parent = elem.parentElement;
    var attributes = elem.attributes;
    parent.innerHTML = await(await fetch(elem.getAttribute('data'))).text();
    let newElement = parent.lastChild;

    for (let attr of attributes) {
        newElement.setAttribute(attr.name, attr.value);
    }
}