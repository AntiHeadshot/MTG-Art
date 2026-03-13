'use strict';

import CropMark from './cropmark.js';
import { ImageDocument } from './pdfCreation.js';
import { ImageDocumentTemplate } from './templateCreation.js';
import { ImageDocumentPreview } from './previewCreation.js';
import ImageCache from './imageCache.js';
import { Card, Format, Frame, Print } from './card.js';
import Tutorial from './tutorial.js';
import Popup from './popup.js';
import './tutorialDefinition.js';
import Events from './events.js';
import { scrollTo } from './scroll.js';
import View from './view.js';
import Toaster from './toaster.js';
import Scryfall from './scryfall.js';
import isMobileBrowser from './browserdetection.js';

let isMobile = isMobileBrowser(navigator.userAgent || navigator.vendor || window.opera);

let cards = window.cards = [];

let searchOptions = window.searchOptions = {
    frames: [],
    isExtendedArt: false,
    isFullArt: false,
}

let printOptions = {
    scaling: 1,
    cardMargin: 0,
    borderMargin: 5,
    pageFormat: "A4",
    cropMarkShape: CropMark.STAR,
    cropMarkColor: "#ffffff",
    cropMarkSize: 5,
    cropMarkWidth: 0.5,
    skipBasicLands: true,
};

let storedPrintOptions = localStorage.getItem('printOptions');
if (storedPrintOptions) {
    Object.assign(printOptions, JSON.parse(storedPrintOptions));
}

document.getElementById('cardSize').value = printOptions.scaling * 100;
document.getElementById('cardMargin').value = printOptions.cardMargin;
document.getElementById('borderMargin').value = printOptions.borderMargin;
document.getElementById('paperFormat').value = printOptions.pageFormat;
document.getElementById('cropmarkSize').value = printOptions.cropMarkSize;
document.getElementById('cropMarkWidth').value = printOptions.cropMarkWidth;
document.getElementById('cropMarkColor').value = printOptions.cropMarkColor;
document.getElementById('skipBasicLands').checked = printOptions.skipBasicLands;

var parent = document.getElementById("cardContainer");
var entryParent = document.getElementById("newDeckInput");

window.Events = Events;
window.View = View;
window.Format = Format;
window.Frame = Frame;
window.Print = Print;
window.CropMark = CropMark;
window.Card = Card;

window.addEventListener("error", function (event) {
    Toaster.showError(`\nError: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
});

window.addEventListener("unhandledrejection", function (event) {
    Toaster.showError(`\nUnhandled rejection: ${event.reason}`);
});

function updateStorageSize(size) {
    let storeSize = Math.round(size / 1048576 * 10) / 10;
    document.getElementById('storeSizeValue').textContent = storeSize;
    if (storeSize > 10)
        document.getElementById("storeSizeDisplay").style.display = "flex";
    else
        document.getElementById("storeSizeDisplay").style.display = "none";
}

updateStorageSize(ImageCache.getObjectStoreSize());
Events.on(Events.Type.StorageChanged, v => updateStorageSize(v.data.totalSize));

var deck;

function updateList() {
    deck = cards.map(c => c.getDescription()).join("\n");

    if (!Tutorial.isOpen) {
        localStorage.setItem('deck', deck);
        sessionStorage.setItem('deck', deck);
    }
}

window.Popup = Popup;

window.changeBrightness = function changeBrightness(value) {
    var deckCards = cards.filter(c => !c.isUnset);

    Events.remove(Events.Type.CardChanged, updateList);
    for (let card of deckCards) {
        card.printSettings.brightness += value;
        card.changed();
    }
    Events.on(Events.Type.CardChanged, updateList);
    updateList();
}

window.setBrightness = function setBrightness(value) {
    var deckCards = cards.filter(c => !c.isUnset);

    Events.remove(Events.Type.CardChanged, updateList);
    for (let card of deckCards) {
        card.printSettings.brightness = value;
        card.changed();
    }
    Events.on(Events.Type.CardChanged, updateList);
    updateList();
}

window.onDrop = async function onDrop(e) {
    e.preventDefault();
    Scryfall.focusPopupWindow();

    let openedCard = Card.getOpenedCard();

    if (openedCard != null) {
        var text = e.dataTransfer.getData("text/uri-list").split("\n");

        if (text && text.length == 1) {
            text = text[0];
            if (/^https:\/\/scryfall\.com\/card\/\w+\/[\w\-%]+\/[\w\-%()/]+$/.test(text)) {
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

window.parseDeck = async function parseDeck(deckText) {
    Events.dispatch(Events.Type.DeckLoading);

    while (parent.lastChild && parent.lastChild.style?.display !== "none")
        parent.removeChild(parent.lastChild);


    while (entryParent.lastChild && entryParent.lastChild.style?.display !== "none")
        entryParent.removeChild(entryParent.lastChild);

    var deckstats = await tryLoadDeckstatDeck(deckText);
    if (deckstats)
        deckText = deckstats;

    let deckLines = deckText.split("\n");
    let cardNr = 0;
    let isMissingMissingTokensText = true;

    if (deckLines.length < 1)
        deckLines.push("");

    for (let i = 0; i < deckLines.length; i++) {
        Toaster.show(`Parsing card ${i + 1} of ${deckLines.length}...`, (i / deckLines.length));
        const cardText = deckLines[i].trim('\r');

        if (cardText == "// Missing Tokens")
            isMissingMissingTokensText = false;

        var card = new Card();
        cards.push(card);

        card.order = ++cardNr;

        await card.setCardText(cardText);

        insertCardInOrder(parent, card, card.elem);
        insertCardInOrder(entryParent, card, card.entryElem);

    }

    let missingTokens = await Card.handleTokens();
    if (missingTokens.length > 0) {
        if (isMissingMissingTokensText) {
            card = new Card()
            card.order = ++cardNr;
            card.setCardText("// Missing Tokens");
            cards.push(card);
            insertCardInOrder(parent, card, card.elem);
            insertCardInOrder(entryParent, card, card.entryElem);
        }

        for (const token of missingTokens) {
            let tokenText = `1 [${token.card.set.toUpperCase()}#${token.card.collector_number}] ${token.card.name} #donotprintfront`;
            if (!cards.some(c => c.getDescription() === tokenText)) {
                card = new Card();
                card.order = ++cardNr;
                card.setCardText(tokenText);
                cards.push(card);
                insertCardInOrder(parent, card, card.elem);
                insertCardInOrder(entryParent, card, card.entryElem);
            }
        }
    }

    updateCardOrder();

    Toaster.hide();

    updateList();
    Events.on(Events.Type.CardChanged, updateList);
}

window.addCardAfter = function addCardAfter(card) {
    const index = cards.indexOf(card);

    var newCard = new Card();
    newCard.order = index + 1;
    cards.push(newCard);

    newCard.setCardText("");

    if (index !== -1) {
        cards.splice(index + 1, 0, cards.pop()); // Move newCard to after the given card
    }

    updateCardOrder();

    insertCardInOrder(parent, newCard, newCard.elem);
    insertCardInOrder(entryParent, newCard, newCard.entryElem);

    updateList();

    return newCard;
};

function updateCardOrder() {
    let cardNr = 0;
    for (const c of cards) {
        c.order = ++cardNr;
        c.updateElem();
    }
}

// Example deck URL: https://deckstats.net/decks/276918/3990370-rawr-from-the-dead
const deckstatUrlRegex = /^https:\/\/deckstats\.net\/decks\/(?<userId>\d+)\/(?<deckId>\d+)-/;

async function tryLoadDeckstatDeck(deck) {
    if (!deck)
        return;

    const deckUrlMatch = deck.match(deckstatUrlRegex);

    if (deckUrlMatch) {
        const { userId, deckId } = deckUrlMatch.groups;
        try {
            return await loadDeckstatDeck(userId, deckId);
        } catch (error) {
            Toaster.showError("Deck could not be loaded; " + JSON.stringify(error.toString()));
        }
    }
}

async function loadDeckstatDeck(userId, deckId) {
    const response = await fetch(`https://deckstats.net/api.php?action=get_deck&id_type=saved&owner_id=${userId}&id=${deckId}&response_type=json`);
    const deckData = await response.json();

    const setsResponse = await fetch('assets/deckstats_sets.json');
    const setsData = await setsResponse.json();
    var sets = setsData;

    function getCardText(card) {
        try {
            if (card.set_id) {
                if (card.collector_number)
                    return `${card.amount} [${sets[card.set_id].abbreviation}#${card.collector_number}] ${card.name}`;
                return `${card.amount} [${sets[card.set_id].abbreviation}] ${card.name}`;
            }
        } catch {
            ;
        }
        return `${card.amount} ${card.name}`;
    }

    let deckText = deckData.sections.map(s => ((s.name && s.name != "Main") ? `// ${s.name}\n` : "")
        + s.cards.map(getCardText).join('\n')).join('\n');

    if (deckData?.sideboard?.length > 0) {
        deckText += '\n// Sideboard\n';
        deckText += deckData.sideboard.map(getCardText).join('\n');
    }

    if (deckData?.tokens?.length > 0) {
        deckText += '\n// Tokens\n';
        deckText += deckData.tokens.map(getCardText).join('\n');
    }

    return deckText;
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

window.deleteCard = function deleteCard(card) {
    if (cards.length <= 1)
        return;

    cards.splice(cards.indexOf(card), 1);
    card.elem.parentNode.removeChild(card.elem);
    card.entryElem.parentNode.removeChild(card.entryElem);
    card.destruct();

    let cardNr = 0;
    for (const card of cards) {
        card.order = ++cardNr;
        card.updateElem();
    }

    updateList()
}

window.input = async function input(event, card) {
    if (event.ctrlKey && event.key === 'Delete') {
        if (card) {
            var id = cards.indexOf(card);
            deleteCard(card);
            event.preventDefault();
            card = cards[id];
            if (card)
                card.entryElem.querySelector("#inputField").focus();
        }
    } else if (event.key === 'Enter') {
        event.preventDefault();

        if (event.ctrlKey) {
            if (card)
                //waits for update ... may be bad (same for esc and arrows)
                card.entryElem.querySelector("#inputField").blur();
        } else {
            //has to be read before new element is added
            var value = event.target.value;
            var selectionStart = event.target.selectionStart;

            var newCard = addCardAfter(card);

            if (selectionStart > 0 && selectionStart < value.length) {
                newCard.text = value.substring(selectionStart);
                newCard.entryElem.querySelector("#inputField").value = newCard.text;
                card.entryElem.querySelector("#inputField").value = value.substring(0, selectionStart);
                card.setCardText(card.entryElem.querySelector("#inputField").value);
            }

            let newInputField = newCard.entryElem.querySelector("#inputField");
            newInputField.focus();
            newInputField.selectionStart = 0;
            newInputField.selectionEnd = 0;
            newCard.textChanged();
            updateList();
        }
    } else if (event.key === "d" && event.ctrlKey) {
        event.preventDefault();

        if (!card)
            card = cards[cards.length - 1];
        var newCard = addCardAfter(card);
        await newCard.setCardText(card.getDescription());
        newCard.entryElem.querySelector("#inputField").focus();
    } else if (event.key === "ArrowUp") {
        cards.findLast(c => c.order < card.order)?.entryElem.querySelector("#inputField").focus();
    } else if (event.key === "ArrowDown") {
        cards.find(c => c.order > card.order)?.entryElem.querySelector("#inputField").focus();
    }
}

window.cardTextChanged = async function cardTextChanged(card) {
    var texts = card.entryElem.querySelector("#inputField").value.split("\n");
    if (texts.length <= 1) {
        var deckstatDeck = await tryLoadDeckstatDeck(texts[0]);
        if (deckstatDeck)
            texts = deckstatDeck.split('\n');
        else
            return card.textChanged();
    }

    await card.setCardText(texts[0]);

    for (let i = 1; i < texts.length; i++) {
        card = addCardAfter(card);
        card.setCardText(texts[i].trim());
    }
    card.entryElem.querySelector("#inputField").focus();

    updateCardOrder();
}

window.copyAs = function copyAs(format) {
    let text = "";

    for (const card of cards) {
        if (!card.isUnset)
            text += card.getDescription(format) + "\n";
    }

    navigator.clipboard.writeText(text);
    Toaster.show("Copied to clipboard");
}

window.highlightDeckInput = function highlightDeckInput(card) {

}

window.removeHighlightDeckInput = function removeHighlightDeckInput(card) {

}

window.swapTo = function swapTo(target) {
    if (target == View.Mode.PDF && !cards.length)
        return;

    let selectedCard;
    switch (View.mode) {
        case View.Mode.ARTVIEW:
            selectedCard = cards.filter(c => !c.isUnset).find(c => c.elem.getBoundingClientRect().top > 0);
            document.body.classList.remove('artView');
            break;
        case View.Mode.INPUT:
            selectedCard = cards.filter(c => !c.isUnset).find(c => {
                let rect = c.elem.getBoundingClientRect();
                return rect.top <= (window.innerHeight / 2 + 10) && rect.bottom >= (window.innerHeight / 2 - 10);
            });
            break;
        case View.Mode.PDF:
            document.body.classList.remove('pdfView');
            break;
    }

    switch (View.mode = target) {
        case View.Mode.ARTVIEW:
            document.body.classList.add('artView');
            break;
        case View.Mode.PDF:
            document.body.classList.add('pdfView');
            selectedCard = null;
            updatePdfPreview();
            break;
        case View.Mode.INPUT:
            break;
    }

    if (selectedCard)
        scrollTo(selectedCard, cards, "instant");

    Events.dispatch(Events.Type.ViewChanged, target);
};

window.updatePdfPreview = async function updatePdfPreview() {
    var imageDocument = new ImageDocumentPreview(printOptions);

    for (const card of cards)
        if (!card.isUnset)
            if (!(card.isBasicLand && printOptions.skipBasicLands))
                imageDocument.addCard(card.count, card);

    var containerDiv = imageDocument.create((p) => Toaster.show("loading high res preview", p));
    var previewParent = document.getElementById("pdfPreviewContainer");
    while (previewParent.firstChild) {
        previewParent.removeChild(previewParent.firstChild);
    }

    previewParent.appendChild(containerDiv);
    document.getElementById("pdfPreviewSettings").style.visibility = "visible";
    document.getElementById("pdfView").style.display = "none";
}

window.hideGeneratedPdf = function hideGeneratedPdf() {
    document.getElementById("downloadPdf").disabled = true;
    document.getElementById("editPdf").disabled = true;
    document.getElementById("pdfPreviewSettings").style.visibility = "visible";
    document.getElementById("pdfView").style.display = "none";
}

window.generatePdf = async function generatePdf() {
    Toaster.show("generating PDF");

    var imageDocument = new ImageDocument(printOptions);

    for (const card of cards)
        if (!card.isUnset)
            if (!(card.isBasicLand && printOptions.skipBasicLands))
                for (let img of card.printOptions.map(po => (po == Print.FRONT) ?
                    card.highResImageUris[0] :
                    ((po == Print.BACK) && (card.highResImageUris.length > 1)) ?
                        card.highResImageUris[1] : null)
                    .filter(uri => uri != null))
                    imageDocument.addImage(card.count, img, card.printSettings);

    document.getElementById("pdfContainer").classList.add("updating");

    document.getElementById("pdfView").style.display = "block";
    document.getElementById("pdfPreviewSettings").style.visibility = "hidden";

    return imageDocument.create((p) => Toaster.show("generating PDF", p)).then(url => {
        document.getElementById("pdfView").src = url;
        document.getElementById("downloadPdf").disabled = false;
        document.getElementById("editPdf").disabled = false;
        document.getElementById("pdfContainer").classList.remove("updating");
    });
}

window.updatePdfCreation = function updatePdfCreation(targetOptions) {
    Object.assign(printOptions, targetOptions);

    for (let img of document.getElementById("cropMarkShapes").querySelectorAll("img")) {
        img.classList.toggle("selected", img.dataset.value == printOptions.cropMarkShape);
    }

    localStorage.setItem('printOptions', JSON.stringify(printOptions));

    let template = ImageDocumentTemplate.create(printOptions);

    let dataUri = "data:image/svg+xml," + encodeURIComponent(template.svg);
    document.getElementById("templateDisplay").src = dataUri;

    let templateElem = document.getElementById("templateDisplayDetail");

    templateElem.src = dataUri;
    templateElem.style.setProperty("--zoom", 1 / template.scale);
    templateElem.style.setProperty("--x", template.corner.x * 100 + "%");
    templateElem.style.setProperty("--y", template.corner.y * 100 + "%");

    updatePdfPreview();
}

window.saveFile = function saveFile(src, fileName) {
    if (src) {
        const a = document.createElement('a');
        a.href = src;
        a.download = fileName;
        a.click();
    }
}

var allArtElem = document.getElementById("allArt");
var extendedArtElem = document.getElementById("extendedArt");
var fullArtElem = document.getElementById("fullArt");

window.selectAllArt = function selectAllArt() {
    var value = !(searchOptions.isFullArt || searchOptions.isExtendedArt)
    searchOptions.isFullArt = value;
    searchOptions.isExtendedArt = value;

    updateArtButtons();
    window.openScryfall();
}

window.selectExtendedArt = function selectWideArt() {
    searchOptions.isExtendedArt = !searchOptions.isExtendedArt;

    updateArtButtons();
    window.openScryfall();
}

window.selectFullArt = function selectFullArt() {
    searchOptions.isFullArt = !searchOptions.isFullArt;

    updateArtButtons();
    window.openScryfall();
}

window.selectFrameType = function selectFrameType(elem, frameType) {
    if (searchOptions.frames.includes(frameType)) {
        searchOptions.frames = searchOptions.frames.filter(f => f !== frameType);
        elem.classList.remove("selected");
    } else {
        searchOptions.frames.push(frameType);
        elem.classList.add("selected");
    }
    window.openScryfall();
}

window.openScryfall = function openScryfall(card, evt) {
    card ||= Card.getOpenedCard();
    card?.openScryfall(evt, searchOptions, document.getElementById("newDeckInput").getBoundingClientRect());
};

function updateArtButtons() {
    fullArtElem.classList.toggle("selected", searchOptions.isFullArt);
    extendedArtElem.classList.toggle("selected", searchOptions.isExtendedArt);
    allArtElem.classList.toggle("selected", !(searchOptions.isFullArt || searchOptions.isExtendedArt));
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

window.updatePdfCreation({});
window.updatePdfCreation({});

async function initDeck() {
    deck = sessionStorage.getItem("deck") ?? localStorage.getItem("deck")

    if (!deck)
        deck = await (await fetch('assets/placeholder.txt')).text();
    window.Tutorial = Tutorial;

    if (isMobile)
        document.getElementById("tutorialButton").style.display = 'none';
    else {
        if (localStorage.getItem('finishedTutorial') == null) {
            Tutorial.start();
            deck = await (await fetch('assets/placeholder.txt')).text();
        }
    }

    if (deck)
        parseDeck(deck);
};

initDeck();

window.scrollToCard = async function scrollToCard(card) {
    if (cards?.length > 0) {
        if (card.isUnset)
            card = cards.find(c => !c.isUnset && c.order > card.order) ?? cards.findLast(c => !c.isUnset && c.order < card.order);

        if (card) {
            scrollTo(card, cards);
            Events.dispatch(Events.Type.ScrollingToCard, card);
        }
    }
}

const storeSizeDisplay = document.getElementById('storeSizeDisplay');
const customContextMenu = document.getElementById('customContextMenu');

storeSizeDisplay.addEventListener('contextmenu', function (event) {
    event.preventDefault();
    let size = customContextMenu.getBoundingClientRect();
    customContextMenu.style.opacity = 1;
    customContextMenu.style.pointerEvents = "all";
    customContextMenu.style.left = `${event.pageX - size.width}px`;
    customContextMenu.style.top = `${event.pageY - size.height}px`;
});

document.addEventListener('click', function () {
    customContextMenu.style.opacity = 0;
    customContextMenu.style.pointerEvents = "none";
});

window.cacheClearAll = ImageCache.clearAllSessions();
window.cacheClearOld = ImageCache.clearOldSessions();
