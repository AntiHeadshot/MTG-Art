let openedCard;
let popupWindow;
let cards = [];

class Card {
    constructor(set, nr, name, count, cardId, oracleId, imageUri) {
        this.set = set;
        this.nr = nr;
        this.name = name;
        this.count = count;
        this.cardId = cardId;
        this.oracleId = oracleId;
        this.uri = imageUri;
    }

    static parseCardText(cardText) {
        const regex = /^(\d+)\s+\[(\w+)#(\d+)\]\s+(.+)$/;
        const match = cardText.match(regex);

        if (match) {
            const count = parseInt(match[1], 10);
            const set = match[2];
            const nr = match[3];
            const name = match[4];

            return fetch(`https://api.scryfall.com/cards/${set}/${nr}`)
                .then(response => response.json())
                .then(data => {
                    var cardId = data.id;
                    var oracleId = data.oracle_id;
                    var uri = data.image_uris.normal;
                    return new Card(set, nr, name, count, cardId, oracleId, uri);
                })
                .then(card => new Promise(resolve => setTimeout(() => resolve(card), 100)))
                .catch(error => console.error("Error fetching data:", error));
        } else {
            throw new Error("Invalid card text format");
        }
    }
}

function openScryfall(evt) {
    var oracleId = evt.srcElement.getAttribute("oracle-id");

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
    openedCard = evt.srcElement.card;
    openedCard.elem.classList.add("selected");

    popupWindow = window.open(src, "_blank", `popup=true,` +
        `width=${imgsrc.width},` +
        `height=${imgsrc.height},` +
        `left=${imgsrc.left + dx},` +
        `top=${imgsrc.top + dy}`);
    var timer = setInterval(function () {
        if (popupWindow.closed) {
            clearInterval(timer);

            openedCard.elem.classList.remove("selected");
            openedCard = null;
        }
    }, 500);
}

window.onload = () => {
    var drop = document.getElementById("cardContainer");

    drop.addEventListener("dragover", e => {
        e.preventDefault();
    });

    drop.addEventListener("drop", e => {
        e.preventDefault();
        if (openedCard != null) {
            var image = e.dataTransfer.files[0];
            var text = e.dataTransfer.getData("text");

            if (image && image.type.startsWith("image/")) {
                openedCard.elem.src = URL.createObjectURL(image);
                openedCard.elem.cardId = openedCard.cardId;
                openedCard.elem.setAttribute("oracle-id", openedCard.oracleId);
            }

            if (text) {
                if (/^https:\/\/scryfall\.com\/card\/\w+\/\w+\/[\w-]+$/.test(text)) {
                    const urlParts = text.split('/');
                    openedCard.set = urlParts[4];
                    openedCard.nr = urlParts[5];

                    openedCard.elem.textContent = `${openedCard.count} [${openedCard.set}#${openedCard.nr}] ${openedCard.name}`;

                    fetch(`https://api.scryfall.com/cards/${openedCard.set}/${openedCard.nr}`)
                        .then(response => response.json())
                        .then(data => {
                            openedCard.id = data.id;
                            openedCard.uri = data.image_uris.normal;
                        })
                        .then(card => new Promise(resolve => setTimeout(() => resolve(card), 100)))
                        .then(_ => {
                            updateList();
                        });

                } else if (/^https:\/\/cards\.scryfall\.io\/\w+\/\w+\/\w+\/\w+\/[\w-]+\.jpg\?\d+$/.test(text)) {
                    const id = text.split('/')[7].split('.')[0];
                    fetch(`https://api.scryfall.com/cards/${id}`)
                        .then(response => response.json())
                        .then(data => {
                            openedCard.id = data.id;
                            openedCard.set = data.set;
                            openedCard.nr = data.collector_number;
                            openedCard.uri = data.image_uris.normal;
                        })
                        .then(card => new Promise(resolve => setTimeout(() => resolve(card), 100)))
                        .then(_ => {
                            openedCard.elem.textContent = `${openedCard.count} [${openedCard.set}#${openedCard.nr}] ${openedCard.name}`;
                            updateList();
                        }
                        );
                }
            }
        }
        popupWindow.focus();
    });
}

function updateList() {
    document.getElementById("deckInput").value = cards.map(c => `${c.count} [${c.set.toUpperCase()}#${c.nr}] ${c.name}`).join("\n");
}

document.addEventListener("drop", e => {
    e.preventDefault();
});

document.addEventListener("dragover", e => {
    e.preventDefault();
});

function parseDeck() {
    var template = document.getElementById("cardTemplate");
    var parent = document.getElementById("cardContainer");

    while (parent.lastChild && parent.lastChild.style?.display !== "none")
        parent.removeChild(parent.lastChild);

    var deckText = document.getElementById("deckInput").value;

    deckText.split("\n")
        .map(c => Card.parseCardText(c).then(card => {

            var clone = template.cloneNode(true);
            clone.src = card.uri;
            clone.id = "card" + card.cardId;
            clone.setAttribute("oracle-id", card.oracleId);
            clone.card = card;
            card.elem = clone;
            clone.addEventListener("click", openScryfall);
            clone.textContent = `${card.count} [${card.set}#${card.nr}] ${card.name}`;
            clone.style.display = "block";
            parent.appendChild(clone);
            cards.push(card);
        }));
}