let openedCard;
let popupWindow;
let cards = [];
let cardCnt = 0;
let observer;
let firstCard;

const Format = Object.freeze({
    DECKSTAT: 'deckstat',
    MTGPRINT: 'mtgprint',
    SCRYFALL: 'scryfall',
    UNDEFINED: 'undefined'
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
        if (this.format === Format.UNDEFINED)
            return `${this.count} ${this.searchName}`;
        if (this.format === Format.MTGPRINT)
            return `${this.count} ${this.name} (${this.set.toUpperCase()}) ${this.nr}`;
        if (this.format === Format.SCRYFALL)
            return `${this.count} ${this.scryfall_uri}`;

        return `${this.count} [${this.set.toUpperCase()}#${this.nr}] ${this.name}`;
    }

    static async parseCardText(cardText) {
        // Example cardText: "1 [CMR#656] Vampiric Tutor"
        const regex = /^(?<count>\d+)\s+\[(?<set>\w+)#(?<nr>[\w-]+)\]\s+.+$/;
        let match = cardText.match(regex);
        let format = Format.DECKSTAT;

        if (!match) {
            // Example cardText: "1 Legion's Landing // Adanto, the First Fort (PXTC) 22"
            const regex2 = /^(?<count>\d+)\s+(?<name>.+)\s\((?<set>\w+)\)\s+(?<nr>[\w-]+)$/;
            format = Format.MTGPRINT;
            match = cardText.match(regex2);
        }
        if (!match) {
            // Example cardText: "1 https://scryfall.com/card/cmr/656/vampiric-tutor"
            const regex3 = /^(?<count>\d+)\s+(https:\/\/scryfall\.com\/card\/(?<set>\w+)\/(?<nr>[\w\-%]+)\/[\w\-%()\/]+)/;
            format = Format.SCRYFALL;
            match = cardText.match(regex3);
        }

        if (!match) {
            // Example cardText: "1 Vampiric Tutor"
            const regex3 = /^(?<count>\d+)\s+(?<name>.+)$/;
            format = Format.UNDEFINED;
            match = cardText.match(regex3);

            const { count, name } = match.groups;

            var card = new Card(parseInt(count, 10), format);
            await card.search(name);
            return card;
        }
        if (!match) {
            throw new Error("Invalid card text format");
        }

        const { count, set, nr } = match.groups;

        var card = new Card(parseInt(count, 10), format);
        await card.update(false, set, nr);
        return card;
    }

    async update(isRevert, setOrCardId, nr) {
        setOrCardId = setOrCardId.toUpperCase();

        if (nr) {
            if (this.set == setOrCardId && this.nr == nr)
                return;
        } else if (this.cardId == setOrCardId)
            return;

        const now = Date.now();
        let url;

        this.startUpdate();

        if (!this.history)
            this.history = [];

        if (!isRevert) {
            this.future = [];
            if (this.set && this.nr)
                this.history.push({ set: this.set, nr: this.nr });
        }

        try {
            if (nr) {
                url = `https://api.scryfall.com/cards/${setOrCardId}/${nr}`;
                const cacheKey = `card_${setOrCardId}_${nr}`;
                const cachedCard = localStorage.getItem(cacheKey);

                if (cachedCard) {
                    const cachedData = JSON.parse(cachedCard);
                    this.applyCardData(cachedData.data);
                    return;
                }
            } else {
                url = `https://api.scryfall.com/cards/${setOrCardId}`;
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

    async search(name) {

        const now = Date.now();
        let url;

        url = `https://api.scryfall.com/cards/search?order=name&q=%21\"${name}\"&include_extras=true`;

        try {
            const cacheSearchKey = `card_${name}`;
            const cachedCard = localStorage.getItem(cacheSearchKey);

            this.searchName = name;

            if (cachedCard) {
                const cachedData = JSON.parse(cachedCard);
                await this.update(false, cachedData.set, cachedData.nr);
                return;
            }

            await delayScryfallCall();

            const response = await fetch(url);
            const data = await response.json();

            if (data.total_cards.length < 1) {
                console.log(data);
                return;
            }

            this.applyCardData(data.data[0]);

            localStorage.setItem(cacheSearchKey, JSON.stringify({ timestamp: now, set: this.set, nr: this.nr }));
            localStorage.setItem(`card_${this.set}_${this.nr}`, JSON.stringify({ timestamp: now, data: data.data[0] }));
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

        this.elem.querySelector("img").src = this.imageUri;
        this.elem.setAttribute("identifier", this.getDescription());
        this.elem.id = "card" + this.cardId;

        if (!this.elem.style.zIndex)
            this.elem.style.zIndex = 9000 - this.order;
        this.elem.style.top = `${this.order * 2 + 4}px`;
        this.elem.style.bottom = `${Math.max(0, cardCnt - this.order) * 2 + 4}px`;
        this.elem.style.transition = `bottom 1s ease-in-out`;

        if (!this.elem.style.transform)
            this.elem.style.transform = `rotate(${(Math.random() - 0.5) * 2 * 2}deg)`;

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
        this.future.push({ set: this.set, nr: this.nr });
        this.update(true, lastState.set, lastState.nr);

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
        this.history.push({ set: this.set, nr: this.nr });
        this.update(true, nextState.set, nextState.nr);

        this.elem.classList.add("revertable");
        this.elem.classList.toggle("forwardable", this.future?.length > 0);

        updateList();
    }
}

function openScryfall(evt, card) {
    var oracleId = card.oracleId;
    var imgsrc = document.getElementById("deckInput").getBoundingClientRect();

    var src = card.format === Format.UNDEFINED ?
        `https://scryfall.com/search?order=name&q=%21\"${card.searchName}\"&include_extras=true&as=grid&order=released&unique=prints` :
        "https://scryfall.com/search?q=oracleid%3A" + oracleId + "&unique=prints&as=grid&order=released";

    var dx = evt.screenX - evt.clientX;
    var dy = evt.screenY - evt.clientY;

    if (openedCard != null)
        openedCard.elem.classList.remove("selected");
    openedCard = card;
    openedCard.elem.classList.add("selected");

    clearInterval(timer);
    if (popupWindow && !popupWindow.closed) {
        popupWindow.location = src;
        popupWindow.focus();
    } else {
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

function updateList() {
    var deck = cards.map(c => c.getDescription ? c.getDescription() : c).join("\n");
    document.getElementById("deckInput").value = deck;

    localStorage.setItem('deck', deck);
}

document.addEventListener("DOMContentLoaded", async function () {
    document.getElementById("deckInput").value = localStorage.getItem('deck');
    document.getElementById("deckInput").setAttribute("placeholder",
        `// Possible Inputs:

// Cardlist from deckstats.net
1 [CMR#656] Vampiric Tutor
2 [TMH3#2] Eldrazi Spawn

// link to a public deck on deckstats.net
https://deckstats.net/decks/276918/3990370-rawr-from-the-dead/en

// list of cards from mtgprint.net
1 Legion's Landing // Adanto, the First Fort (PXTC) 22
2 Vampiric Tutor (CMR) 656

// link to a card on scryfall.com
1 https://scryfall.com/card/cmr/656/vampiric-tutor
2 https://scryfall.com/card/totc/10/zombie?utm_source=api

// Cardnames and count without set names
1 Vampiric Tutor
2 Eldrazi Spawn
// if you do this the card will be undefined untill you change it to a specific card

// How to use:
// 1. Paste your decklist here
// 2. Press "Load Deck"
// 3. Wait for the cards to load
// 4. Click on a card to open it on Scryfall
// 5. Drag and drop a card image from Skryfall on thi page to update the opened card
// (The list will be saved automatically)
// 7. Press "Copy to Clipboard" to copy the list of cards to your clipboard
`);
});

async function onDrop(e) {
    e.preventDefault();
    popupWindow.focus();
    print("\ndropped:\n" + e.dataTransfer.getData("text/uri-list"));

    if (openedCard != null) {
        var text = e.dataTransfer.getData("text/uri-list").split("\n");

        if (text && text.length == 1) {
            text = text[0];
            if (/^https:\/\/scryfall\.com\/card\/\w+\/[\w\-%]+\/[\w\-%()\/]+$/.test(text)) {
                const urlParts = text.split('/');

                await openedCard.update(false, urlParts[4], urlParts[5]);
                if (openedCard.format === Format.UNDEFINED)
                    openedCard.format = Format.DECKSTAT;
                updateList();

            } else if (/^https:\/\/cards\.scryfall\.io\/\w+\/\w+\/\w+\/[\w-]+\/[\w-]+\.jpg\?\d+$/.test(text)) {
                const id = text.split('/')[7].split('.')[0];

                await openedCard.update(false, id);
                if (openedCard.format === Format.UNDEFINED)
                    openedCard.format = Format.DECKSTAT;
                updateList();
            }
        }
    }
};

async function parseDeck() {
    var deckText = document.getElementById("deckInput").value;

    if (deckText.trim() === "")
        return;

    if (document.getElementById("loadDeck").disabled)
        return;

    document.getElementById("loadDeck").disabled = true;
    document.getElementById("copyScryfallBtn").disabled = false;
    document.getElementById("convertToMtgPrintBtn").disabled = false;

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

            deckText = deckData.sections.map(s => ((s.name && s.name != "Main") ? `\n// ${s.name}\n` : "") + s.cards.map(c => {
                if (c.set_id)
                    return `${c.amount} [${sets[c.set_id].abbreviation}#${c.collector_number}] ${c.name}`;
                return `${c.amount} ${c.name}`;
            }).join('\n')).join('\n');

            if (deckData?.tokens?.length > 0) {
                deckText += '\n\n// Tokens\n';
                deckText += deckData.tokens.map(c => {
                    if (c.set_id)
                        return `${c.amount} [${sets[c.set_id].abbreviation}#${c.collector_number}] ${c.name}`;
                    return `${c.amount} ${c.name}`;
                }).join('\n');
            }

            document.getElementById("deckInput").value = deckText;
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

        print(`\nParsing card: ${cardText}`);
        var card = await Card.parseCardText(cardText);
        card.order = ++cardNr;
        var clone = template.cloneNode(true);
        clone.card = card;
        card.elem = clone;
        card.updateElem();
        clone.style.display = "block";
        parent.appendChild(clone);
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
}

window.addEventListener("error", function (event) {
    print(`\nError: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
});

window.addEventListener("unhandledrejection", function (event) {
    print(`\nUnhandled rejection: ${event.reason}`);
});

function print(text) {
    document.getElementById("deckInput").value += text;
}

async function copyToClipboard() {
    var textToCopy = cards.filter(c => c.scryfall_uri).map(c => `${c.count} ${c.scryfall_uri}`).join("\n");
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast("copied to clipboard");
    } catch (err) {
        console.error('Could not copy text: ', err);
    }
}

function convertToMtgPrint() {
    for (const card of cards) {
        if (card instanceof Card)
            card.format = Format.MTGPRINT;
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
}

cleanUpLocalStorage();