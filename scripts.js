let openedCard;
let popupWindow;
let cards = [];

class Card {
    constructor(count, set, nr, name, cardId, oracleId, imageUri) {
        this.set = set;
        this.nr = nr;
        this.name = name;
        this.count = count;
        this.cardId = cardId;
        this.oracleId = oracleId;
        this.uri = imageUri;
    }

    getDescription() { return `${this.count} [${this.set.toUpperCase()}#${this.nr}] ${this.name}`; }

    static async parseCardText(cardText) {
        const regex = /^(\d+)\s+\[(\w+)#(\d+)\]\s+(.+)$/;
        const match = cardText.match(regex);

        if (match) {
            const count = parseInt(match[1], 10);
            const set = match[2];
            const nr = match[3];

            var card = new Card(count);
            await card.update(set, nr);
            return card;
        } else {
            throw new Error("Invalid card text format");
        }
    }

    async update(setOrCardId, nr) {
        const url = nr ? `https://api.scryfall.com/cards/${setOrCardId}/${nr}` : `https://api.scryfall.com/cards/${setOrCardId}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            this.cardId = data.id;
            this.oracleId = data.oracle_id;
            this.uri = data.image_uris.normal;
            this.set = data.set;
            this.nr = data.collector_number;
            this.name = data.name;
            this.updateElem();

            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error("Error updating card:", error);
        }
    }

    updateElem() {
        if (this.elem == null)
            return;

        this.elem.querySelector("img").src = this.uri;
        this.elem.setAttribute("identifier", this.getDescription());
        this.elem.id = "card" + this.cardId;
    }
}

function openScryfall(evt,card) {
    var oracleId = card.oracleId;
    var imgsrc = document.getElementById("deckContainer").getBoundingClientRect();
    var src = "https://scryfall.com/search?q=oracleid%3A" + oracleId + "&unique=prints&as=grid&order=released";

    var dx = evt.screenX - evt.clientX;
    var dy = evt.screenY - evt.clientY;

    if (popupWindow) {
        clearInterval(timer);
        if (!popupWindow.closed)
            popupWindow.close();
    }

    if (openedCard != null)
        openedCard.elem.classList.remove("selected");
    openedCard = card;
    openedCard.elem.classList.add("selected");

    popupWindow = window.open(src, "_blank", `popup=true,` +
        `width=${imgsrc.width},` +
        `height=${imgsrc.height},` +
        `left=${imgsrc.left + dx},` +
        `top=${imgsrc.top + dy}`);
    var timer = setInterval(function () {
        if (popupWindow.closed) {
            clearInterval(timer);
            openedCard?.elem?.classList?.remove("selected");
            openedCard = null;
        }
    }, 500);
}

function updateList() {
    document.getElementById("deckInput").value = cards.map(c => c.getDescription()).join("\n");
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

function parseDeck() {
    var template = document.getElementById("cardTemplate");
    var parent = document.getElementById("cardContainer");

    while (parent.lastChild && parent.lastChild.style?.display !== "none")
        parent.removeChild(parent.lastChild);

    var deckText = document.getElementById("deckInput").value;

    deckText.split("\n")
        .map(c => Card.parseCardText(c).then(card => {
            var clone = template.cloneNode(true);
            clone.card = card;
            card.elem = clone;
            card.updateElem();
            clone.style.display = "block";
            parent.appendChild(clone);
            cards.push(card);
        }));
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