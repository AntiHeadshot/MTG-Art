import getSettings from './printSettings.js';
import { getDataUrl } from './image.js';
import CropMark from './cropmark.js';
import { Print } from './card.js';

class ImageDocumentPreview {
    constructor(options) {
        this.options = options;

        this.cards = [];
    }

    addCard(count, card) {
        this.cards.push({ count, card });
    }

    create(updateCallback) {
        const ptToPx = 1.333;

        let settings = getSettings(this.options, ptToPx);

        let divContainer = document.createElement('div');

        var imgNr = 0;

        let cards1 = this.cards.map(card => Array(card.count).fill(card.card)).flat(1);
        let cards2 = cards1.map(card => (card.printOptions.map(po =>
            (po == Print.FRONT) ? { u: card.imageUris[0], i: 0 } :
                ((po == Print.BACK) && (card.imageUris.length > 1)) ? { u: card.imageUris[1], i: 1 } : null)
            .filter(c => c != null))
            .map(c => ({ card, u: c.u, i: c.i }))).flat(1);
        let cards = cards2.map(x => ({ card: x.card, imageUri: x.u, highResImageUri: x.card.highResImageUris[x.i] }));

        var maxStep = cards.length;

        let pageNr = 0;
        let progress = 0;

        updateCallback(0);

        while (imgNr < cards.length) {
            pageNr++;

            let pageGroup = document.createElement('div');
            pageGroup.setAttribute('id', `page${pageNr}`);
            pageGroup.style.position = 'absolute';
            pageGroup.style.transform = `translate(0px,${((pageNr - 1) * (settings.pageHeight + 16) + 16).toFixed(1)}px)`;
            pageGroup.style.outline = '1px black';
            pageGroup.style.width = `${settings.pageWidth.toFixed(1)}px`;
            pageGroup.style.height = `${settings.pageHeight.toFixed(1)}px`;
            pageGroup.style.background = 'white';
            divContainer.appendChild(pageGroup);

            let cl = 0;
            if (settings.cropMarkShape == CropMark.LINES)
                cl = settings.cropMarkSize - settings.cropMarkWidth * 0.5;
            else
                cl = settings.cropMarkSize;

            let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute('width', settings.pageWidth);
            svg.setAttribute('height', settings.pageHeight);
            svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
            svg.style.position = 'absolute';
            svg.style.zIndex = 10;
            svg.style.pointerEvents = 'none';

            if (settings.cropMarkShape != CropMark.NONE) {
                for (let y = 0, yPos = settings.marginY; y <= settings.yCnt; y++, yPos += settings.mtgHeight + settings.cardMargin) {
                    for (let x = 0, xPos = settings.marginX; x <= settings.xCnt; x++, xPos += settings.mtgWidth + settings.cardMargin) {
                        {
                            switch (settings.cropMarkShape) {
                                case CropMark.STAR:
                                    {
                                        let inset = cl * .9;
                                        let insetO = cl - inset;

                                        let star = document.createElementNS("http://www.w3.org/2000/svg", 'path');
                                        star.setAttribute('stroke-width', '0');
                                        star.setAttribute('fill', settings.cropMarkColor);
                                        star.setAttribute('d', `M ${xPos - cl},${yPos} `
                                            + `c ${inset},${insetO} ${inset},${insetO} ${cl},${cl} `
                                            + `c ${insetO},-${inset} ${insetO},-${inset} ${cl},-${cl} `
                                            + `c -${inset},-${insetO} -${inset},-${insetO} -${cl},-${cl} `
                                            + `c -${insetO},${inset} -${insetO},${inset} -${cl},${cl}`);

                                        svg.appendChild(star);
                                    }
                                    break;
                                case CropMark.LINES:
                                default:
                                    {
                                        let line = document.createElementNS("http://www.w3.org/2000/svg", 'path');

                                        line.setAttribute('stroke-width', settings.cropMarkWidth);
                                        line.setAttribute('stroke', settings.cropMarkColor);
                                        line.setAttribute('stroke-linecap', 'round');
                                        line.setAttribute('fill', 'transparent');
                                        line.setAttribute('d', `M${xPos},${yPos - cl} v${cl * 2} M${xPos - cl},${yPos} h${cl * 2}`);

                                        svg.appendChild(line);
                                    }
                                    break;
                            }
                        }
                    }
                }
            }
            pageGroup.appendChild(svg);

            for (let y = 0, yPos = settings.marginY; y < settings.yCnt && imgNr < cards.length; y++, yPos += settings.mtgHeight + settings.cardMargin) {
                for (let x = 0, xPos = settings.marginX; x < settings.xCnt && imgNr < cards.length; x++, xPos += settings.mtgWidth + settings.cardMargin, imgNr++) {

                    let card = cards[imgNr];

                    let img = document.createElement('img');
                    img.style.transform = `translate(${xPos.toFixed(1)}px,${yPos.toFixed(1)}px)`;
                    img.style.position = 'absolute';

                    if (card.card.printSettings?.brightness != null && card.card.printSettings.brightness != 100)
                        img.style.filter = `brightness(${card.card.printSettings.brightness}%)`;
                    img.setAttribute('width', settings.mtgWidth + 'px');
                    img.setAttribute('height', settings.mtgHeight + 'px');
                    img.setAttribute('src', card.imageUri);

                    img.addEventListener('mousedown', (event) => {
                        event.preventDefault();

                        if (event.button === 0)
                            card.card.printSettings.brightness += 5;
                        else if (event.button === 1) {
                            event.preventDefault();
                            card.card.printSettings.brightness = 100;
                        }
                        else if (event.button === 2) {
                            event.preventDefault();
                            card.card.printSettings.brightness -= 5;
                        }

                        card.card.updated();
                    });

                    img.addEventListener('contextmenu', (event) => {
                        event.preventDefault();
                    });

                    card.card.addImageElem(img);

                    getDataUrl(card.highResImageUri).then(dataUrl => { img.setAttribute('src', dataUrl); });

                    pageGroup.appendChild(img);

                    progress++;
                    updateCallback(progress / maxStep);
                }
            }
        }

        divContainer.setAttribute('viewBox', `0 0 ${settings.pageWidth} ${pageNr * (settings.pageHeight + 16) - 16}`);
        // divContainer.style.width = `${settings.pageWidth.toFixed(1)}px`;
        // divContainer.style.height = `${(pageNr * (settings.pageHeight + 16) - 16).toFixed(1)}px`;
        divContainer.style.width = "100%";
        divContainer.style.height = "auto";
        divContainer.style.justifyItems = 'center';

        return divContainer;
    }
}

export default ImageDocumentPreview;
export { ImageDocumentPreview };