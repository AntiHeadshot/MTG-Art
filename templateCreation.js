import * as _ from 'https://cdn.jsdelivr.net/npm/pdfkit@0.16.0/js/pdfkit.standalone.js';
import { CropMark } from './pdfCreation.js';

class ImageDocumentTemplate {

    static create(options) {
        let _scaling = options?.scaling || 1;
        let _cardMargin = options?.cardMargin || 0;
        let _borderMargin = options?.borderMargin || 5;
        let _pageFormat = options?.pageFormat || "A4";
        let _cropMarkShape = options?.cropMarkShape || CropMark.LINES;
        let _cropMarkColor = options?.cropMarkColor || 'white';
        let _cropMarkSize = options?.cropMarkSize || 5;
        let _cropMarkWidth = options?.cropMarkWidth || .5;

        const pageOptions = { size: _pageFormat };

        const doc = new PDFDocument(pageOptions);

        const mmToPt = 2.8346456693;
        const ptToPx = 1.333;

        const cropMarkSize = _cropMarkSize * .5 * mmToPt * ptToPx;

        const pageHeight = doc.page.height * ptToPx;
        const pageWidth = doc.page.width * ptToPx;

        const margin = _borderMargin * mmToPt * ptToPx;
        const cardMargin = _cardMargin * mmToPt * ptToPx;

        const mtgWidth = 63.5 * _scaling * mmToPt * ptToPx;
        const mtgHeight = 88.9 * _scaling * mmToPt * ptToPx;

        const cornerRadius = 3 * _scaling * mmToPt * ptToPx;

        const adjustedMtgWidth = mtgWidth + cardMargin;
        const adjustedMtgHeight = mtgHeight + cardMargin;
        const xCnt = Math.floor((pageWidth - 2 * margin - mtgWidth) / adjustedMtgWidth) + 1;
        const yCnt = Math.floor((pageHeight - 2 * margin - mtgHeight) / adjustedMtgHeight) + 1;

        const marginX = (pageWidth - (xCnt * adjustedMtgWidth - cardMargin)) / 2;
        const marginY = (pageHeight - (yCnt * adjustedMtgHeight - cardMargin)) / 2;

        let svg = [];
        svg.push(`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`);
        svg.push(`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageWidth} ${pageHeight}">`);

        svg.push(`<rect fill="white" `
            + `width="${pageWidth}" height="${pageHeight}"></rect>`);
        for (let y = 0, yPos = marginY; y < yCnt; y++, yPos += adjustedMtgHeight) {
            for (let x = 0, xPos = marginX; x < xCnt; x++, xPos += adjustedMtgWidth) {
                svg.push(`<rect fill="gray" x="${xPos}" y="${yPos}" width="${mtgWidth}" height="${mtgHeight}"></rect>`);
                svg.push(`<rect stroke="red" stroke-width="0.3mm" fill="transparent" rx="${cornerRadius}" x="${xPos}" y="${yPos}" width="${mtgWidth}" height="${mtgHeight}"></rect>`);
            }
        }

        let cl_2 = cropMarkSize / 2;

        if (_cropMarkShape != CropMark.NONE)
            for (let y = 0, yPos = marginY; y <= yCnt; y++, yPos += adjustedMtgHeight) {
                for (let x = 0, xPos = marginX; x <= xCnt; x++, xPos += adjustedMtgWidth) {
                    {
                        switch (_cropMarkShape) {
                            case CropMark.STAR:
                                let inset = cl_2 * .9;
                                let insetO = cl_2 - inset;
                                svg.push(`<path stroke-width="0" fill="${_cropMarkColor}" d="M ${xPos - cl_2},${yPos} `
                                    + `c ${inset},${insetO} ${inset},${insetO} ${cl_2},${cl_2} `
                                    + `c ${insetO},-${inset} ${insetO},-${inset} ${cl_2},-${cl_2} `
                                    + `c -${inset},-${insetO} -${inset},-${insetO} -${cl_2},-${cl_2} `
                                    + `c -${insetO},${inset} -${insetO},${inset} -${cl_2},${cl_2}"></path>`);
                                break;
                            case CropMark.LINES:
                            default:
                                svg.push(`<path stroke-width="${_cropMarkWidth}" stroke="${_cropMarkColor}" stroke-linecap="round" fill="transparent" `
                                    + `d="M${xPos},${yPos - cl_2} v${cropMarkSize} M${xPos - cl_2},${yPos} h${cropMarkSize}"></path>`);
                                break;
                        }
                    }
                }
            }

        svg.push("</svg>");
        return {
            svg: svg.join("\n")
            , corner: { x: (marginX + mtgWidth + .5 * cardMargin) / pageWidth, y: (marginY + mtgHeight + .5 * cardMargin) / pageHeight }
            , scale: (cardMargin + cornerRadius * 4) / pageWidth
        };
    }
}

export { ImageDocumentTemplate };