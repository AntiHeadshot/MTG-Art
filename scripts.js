import { ImageDocument, CropMark } from './pdfCreation.js';
import { ImageDocumentTemplate } from './templateCreation.js';
import { ImageCache, onStorageSizeChanged } from './imageCache.js';
import { Card, Format, Frame } from './card.js';
import Tutorial from './tutorial.js';
import Events from './events.js';
import { scrollTo } from './scroll.js';
import { View, Mode } from './view.js';
import { Toaster } from './toaster.js';

let cards = window.cards = [];
let hoverOn = true;

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
    cropMarkColor: "white",
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
document.getElementById('skipBasicLands').checked = printOptions.skipBasicLands;

window.Mode = Mode;
window.Format = Format;
window.Frame = Frame;
window.CropMark = CropMark;

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

function updateStorageSize(size) {
    let storeSize = Math.round(size / 1048576 * 10) / 10;
    document.getElementById('storeSizeValue').textContent = storeSize;
    if (storeSize > 10)
        document.getElementById("storeSizeDisplay").style.display = "flex";
    else
        document.getElementById("storeSizeDisplay").style.display = "none";
}

updateStorageSize(ImageCache.getObjectStoreSize());
onStorageSizeChanged(v => updateStorageSize(v.totalSize));

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

    if (!Tutorial.isOpen) {
        localStorage.setItem('deck', deck);
        sessionStorage.setItem('deck', deck);
    }
}

window.onDrop = async function onDrop(e) {
    e.preventDefault();
    Card.focusPopupWindow();
    print("\ndropped:\n" + e.dataTransfer.getData("text/uri-list"));

    let openedCard = Card.getOpenedCard();

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

    Events.dispatch(Events.Type.DeckLoading);

    if (deckText.trim() === "")
        return;

    if (document.getElementById("loadDeck").disabled)
        return;

    document.getElementById("loadDeck").disabled = true;
    view.disabled = true;

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
        Toaster.show(`Parsing card ${i + 1} of ${deckLines.length}...`, (i / deckLines.length));
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
    }

    for (const card of cards) {
        if (card instanceof Card) {
            card.updateElem();
        }
    }

    Events.dispatch(Events.Type.DeckLoaded);

    document.getElementById("convertToScryfallBtn").disabled = false;
    document.getElementById("convertToMtgPrintBtn").disabled = false;
    document.getElementById("convertToDeckstatsBtn").disabled = false;
    view.disabled = false;

    Toaster.hide();

    updateList();
    Events.on(Events.Type.CardChanged, updateList);

    view.on("beforeSelectionChange", (_, selection) => scrollToSelectedCard(cards, selection));
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

window.convertToFormat = function convertToFormat(format) {
    for (const card of cards) {
        if (card instanceof Card)
            card.format = format;
    }

    updateList();
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

window.swapTo = function swapTo(target) {
    if (target == Mode.PDF && !cards.length)
        return;

    let selectedCard;
    switch (View.mode) {
        case Mode.ARTVIEW:
            selectedCard = cards.filter(c => c instanceof Card).find(c => c.elem.getBoundingClientRect().top > 0);
            document.body.classList.remove('artView');
            break;
        case Mode.INPUT:
            selectedCard = cards.filter(c => c instanceof Card).find(c => {
                let rect = c.elem.getBoundingClientRect();
                return rect.top <= (window.innerHeight / 2 + 10) && rect.bottom >= (window.innerHeight / 2 - 10);
            });
            break;
        case Mode.PDF:
            document.body.classList.remove('pdfView');
            break;
    }

    switch (View.mode = target) {
        case Mode.ARTVIEW:
            document.body.classList.add('artView');
            break;
        case Mode.PDF:
            document.body.classList.add('pdfView');
            selectedCard = null;
            break;
        case Mode.INPUT:
            break;
    }

    if (selectedCard)
        scrollTo(selectedCard, "instant");
};

window.generatePdf = async function generatePdf() {
    Toaster.show("generating PDF");

    var imageDocument = new ImageDocument(printOptions);

    for (const card of cards)
        if (card instanceof Card)
            if (!(card.isBasicLand && printOptions.skipBasicLands))
                for (var img of card.highResImageUris)
                    imageDocument.addImage(card.count, img);

    document.getElementById("pdfContainer").classList.add("updating");

    return imageDocument.create((p) => Toaster.show("generating PDF", p)).then(url => {
        document.getElementById("pdfView").src = url;
        document.getElementById("downloadPdf").disabled = false;
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
    let dataUri = "data:image/svg+xml," + encodeURI(template.svg.replace("\n", " "));

    document.getElementById("templateDisplay").src = dataUri;

    let templateElem = document.getElementById("templateDisplayDetail");

    templateElem.src = dataUri;
    templateElem.style.setProperty("--zoom", 1 / template.scale);
    templateElem.style.setProperty("--x", template.corner.x * 100 + "%");
    templateElem.style.setProperty("--y", template.corner.y * 100 + "%");
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
    openScryfall();
}

window.selectExtendedArt = function selectWideArt() {
    searchOptions.isExtendedArt = !searchOptions.isExtendedArt;

    updateArtButtons();
    openScryfall();
}

window.selectFullArt = function selectFullArt() {
    searchOptions.isFullArt = !searchOptions.isFullArt;

    updateArtButtons();
    openScryfall();
}

window.selectFrameType = function selectFrameType(elem, frameType) {
    if (searchOptions.frames.includes(frameType)) {
        searchOptions.frames = searchOptions.frames.filter(f => f !== frameType);
        elem.classList.remove("selected");
    } else {
        searchOptions.frames.push(frameType);
        elem.classList.add("selected");
    }
    openScryfall();
}

window.openScryfall = function openScryfall(card, evt) {
    card ||= Card.getOpenedCard();
    card?.openScryfall(evt, searchOptions, view.display.wrapper.getBoundingClientRect());
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

updatePdfCreation({});

let view = CodeMirror.fromTextArea(document.getElementById("deckInput"));

async function initDeck() {
    let deckText = sessionStorage.getItem("deck") ?? localStorage.getItem("deck") ?? await (await fetch('placeholder.txt')).text()
    view.doc.setValue(deckText);
};

initDeck();

async function scrollToSelectedCard(cards, selection) {
    if (hoverOn && cards?.length > 0) {
        const line = Math.min(selection.ranges[0].anchor.line, selection.ranges[0].head.line);
        let closestCard = cards.find(card => card.lineNr >= line) || cards[cards.length - 1];
        scrollTo(closestCard);
        Events.dispatch(Events.Type.ScrollingToCard, closestCard);
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

window.Tutorial = Tutorial;

if (localStorage.getItem('finishedTutorial') == null)
    Tutorial.start();