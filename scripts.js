let openedCard;
let popupWindow;
let cards = [];
let lastDeck = localStorage.getItem('deck');

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
    constructor(count, set, nr, name, cardId, oracleId, imageUri) {
        this.set = set;
        this.nr = nr;
        this.name = name;
        this.count = count;
        this.cardId = cardId;
        this.oracleId = oracleId;
        this.imageUri = imageUri;
    }

    getDescription() { return `${this.count} [${this.set.toUpperCase()}#${this.nr}] ${this.name}`; }

    static async parseCardText(cardText) {
        const regex = /^(?<count>\d+)\s+\[(?<set>\w+)#(?<nr>[\w-]+)\]\s+(?<name>.+)$/;
        let match = cardText.match(regex);

        if (!match) {
            const regex2 = /^(?<count>\d+)\s+(?<name>.+)\s\((?<set>\w+)\)\s+(?<nr>[\w-]+)$/;
            match = cardText.match(regex2);
        }
        if (!match) {
            const regex3 = /^(?<count>\d+)\s+(?<name>.+)$/;
            match = cardText.match(regex3);

            const { count, name } = match.groups;

            var card = new Card(parseInt(count, 10));
            await card.search(name);
            return card;
        }
        if (!match) {
            throw new Error("Invalid card text format");
        }

        const { count, set, nr } = match.groups;

        var card = new Card(parseInt(count, 10));
        await card.update(set, nr);
        return card;
    }

    async update(setOrCardId, nr) {
        setOrCardId = setOrCardId.toUpperCase();

        const now = Date.now();
        let url;

        this.startUpdate();
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

        url = `https://api.scryfall.com/cards/search?order=name&q=%21\"${name}\"`;

        try {
            await delayScryfallCall();
            const response = await fetch(url);
            const data = await response.json();

            if (data.total_cards.length < 1) {
                console.log(data);
                return;
            }

            this.applyCardData(data.data[0]);
            const cacheKey = `card_${this.set}_${this.nr}`;
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, data: data.data[0] }));
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

        this.elem.querySelector("img").src = this.imageUri;
        this.elem.setAttribute("identifier", this.getDescription());
        this.elem.id = "card" + this.cardId;
    }
}

function openScryfall(evt, card) {
    var oracleId = card.oracleId;
    var imgsrc = document.getElementById("deckInput").getBoundingClientRect();
    var src = "https://scryfall.com/search?q=oracleid%3A" + oracleId + "&unique=prints&as=grid&order=released";

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
    const lastDeckButton = document.getElementById("lastDeck");
    if (!lastDeck) {
        lastDeckButton.disabled = true;
    }
});

function loadLastDeck() {
    document.getElementById("deckInput").value = lastDeck;
}

async function onDrop(e) {
    e.preventDefault();
    popupWindow.focus();
    print("\ndropped:\n" + e.dataTransfer.getData("text/uri-list"));

    if (openedCard != null) {
        var text = e.dataTransfer.getData("text/uri-list").split("\n");

        if (text && text.length == 1) {
            text = text[0];
            if (/^https:\/\/scryfall\.com\/card\/\w+\/[\w-]+\/[\w-]+$/.test(text)) {
                const urlParts = text.split('/');

                await openedCard.update(urlParts[4], urlParts[5]);
                updateList();

            } else if (/^https:\/\/cards\.scryfall\.io\/\w+\/\w+\/\w+\/[\w-]+\/[\w-]+\.jpg\?\d+$/.test(text)) {
                const id = text.split('/')[7].split('.')[0];

                await openedCard.update(id);
                updateList();
            }
        }
    }
};

async function parseDeck() {
    document.getElementById("loadDeck").disabled = true;
    document.getElementById("lastDeck").disabled = true;
    document.getElementById("copyScryfallBtn").disabled = false;

    var template = document.getElementById("cardTemplate");
    var parent = document.getElementById("cardContainer");

    while (parent.lastChild && parent.lastChild.style?.display !== "none")
        parent.removeChild(parent.lastChild);

    var deckText = document.getElementById("deckInput").value;

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

            if (deckData.tokens) {
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
    for (let i = 0; i < deckLines.length; i++) {
        showToast(`Parsing card ${i + 1} of ${deckLines.length}...`);
        const cardText = deckLines[i];
        if (cardText.trim() === "" || cardText.startsWith("//")) {
            cards.push(cardText);
            continue;
        }

        print(`\nParsing card: ${cardText}`);
        var card = await Card.parseCardText(cardText);
        var clone = template.cloneNode(true);
        clone.card = card;
        card.elem = clone;
        card.updateElem();
        clone.style.display = "block";
        parent.appendChild(clone);
        cards.push(card);
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