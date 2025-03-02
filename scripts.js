let openedCard;
let popupWindow;
let cards = [];
let lastDeck = localStorage.getItem('deck');

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
        const regex = /^(?<count>\d+)\s+\[(?<set>\w+)#(?<nr>\w+)\]\s+(?<name>.+)$/;
        let match = cardText.match(regex);

        if (!match) {
            const regex2 = /^(?<count>\d+)\s+(?<name>.+)\s\((?<set>\w+)\)\s+(?<nr>\w+)$/;
            match = cardText.match(regex2);
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
        const url = nr ? `https://api.scryfall.com/cards/${setOrCardId}/${nr}` : `https://api.scryfall.com/cards/${setOrCardId}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            console.log(data);
            this.cardId = data.id;
            this.oracleId = data.oracle_id;
            if (!data.image_uris) {
                this.twoFaced = true;
                this.imageUris = [data.card_faces[0].image_uris.normal, data.card_faces[1].image_uris.normal];
                this.imageUri = this.uris[0];
            }
            else
                this.imageUri = data.image_uris.normal;
            this.set = data.set;
            this.nr = data.collector_number;
            this.name = data.name;
            this.scryfall_uri = data.scryfall_uri
            this.updateElem();

            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error("Error updating card:", error);
        }
    }

    updateElem() {
        if (this.elem == null)
            return;

        this.elem.querySelector("img").src = this.imageUri;
        this.elem.setAttribute("identifier", this.getDescription());
        this.elem.id = "card" + this.cardId;
    }
}

function openScryfall(evt, card) {
    var oracleId = card.oracleId;
    var imgsrc = document.getElementById("deckContainer").getBoundingClientRect();
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
    var deck = cards.map(c => c.getDescription()).join("\n");
    document.getElementById("deckInput").value = deck;

    localStorage.setItem('deck', deck);
}

document.addEventListener("DOMContentLoaded", function () {
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
    print("\ndropped:\n" + e.dataTransfer.getData("text/uri-list"));

    if (openedCard != null) {
        var text = e.dataTransfer.getData("text/uri-list").split("\n");

        if (text && text.length == 1) {
            text = text[0];
            if (/^https:\/\/scryfall\.com\/card\/\w+\/\w+\/[\w-]+$/.test(text)) {
                const urlParts = text.split('/');

                await openedCard.update(urlParts[4], urlParts[5]);
                updateList();

            } else if (/^https:\/\/cards\.scryfall\.io\/\w+\/\w+\/\w+\/\w+\/[\w-]+\.jpg\?\d+$/.test(text)) {
                const id = text.split('/')[7].split('.')[0];

                await openedCard.update(id);
                updateList();
            }
        }
    }
    popupWindow.focus();
};

async function parseDeck() {
    document.getElementById("lastDeck").disabled = true;
    document.getElementById("copyScryfallBtn").disabled = false;

    var template = document.getElementById("cardTemplate");
    var parent = document.getElementById("cardContainer");

    while (parent.lastChild && parent.lastChild.style?.display !== "none")
        parent.removeChild(parent.lastChild);

    var deckText = document.getElementById("deckInput").value;

    for (const cardText of deckText.split("\n")) {
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
    var textToCopy = cards.map(c => `${c.count} ${c.scryfall_uri}`).join("\n");
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast("copied to clipboard");
    } catch (err) {
        console.error('Could not copy text: ', err);
    }
}

function showToast(message) {
    var toaster = document.getElementById('toaster');
    var toasterMessage = document.getElementById('toasterMessage');
    toasterMessage.textContent = message;
    toaster.classList.add("show");
    setTimeout(function() {
        toaster.classList.remove("show");
    }, 3000);
}