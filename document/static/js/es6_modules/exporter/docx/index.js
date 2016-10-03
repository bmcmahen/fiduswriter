import {modelToEditor} from "../../editor/node-convert"
import {createSlug, getDatabasesIfNeeded, downloadFile} from "../tools/file"
import {XmlZip} from "../tools/xml-zip"

import {DocxExporterCitations} from "./citations"
import {DocxExporterImages} from "./images"
import {DocxExporterRender} from "./render"
import {DocxExporterRichtext} from "./richtext"
import {DocxExporterRels} from "./rels"
import {DocxExporterFootnotes} from "./footnotes"
import {DocxExporterMetadata} from "./metadata"
import {textContent} from "../tools/pmJSON"
/*
Exporter to Microsoft Word.

This exporter is experimental.

TODO:
* equations (inline and figure)
*/

export class DocxExporter {
    constructor(doc, bibDB, imageDB) {
        let that = this
        this.doc = doc
        // We use the doc in the pm format as this is what we will be using
        // throughout the application in the future.
        this.pmJSON = this.createPmJSON(this.doc)
        this.template = false
        this.extraFiles = {}
        this.maxRelId = {}
        this.pmBib = false
        this.docTitle = textContent(this.pmJSON.content[0])
        this.metadata = new DocxExporterMetadata(this, this.pmJSON)
        this.footnotes = new DocxExporterFootnotes(this, this.pmJSON)
        this.render = new DocxExporterRender(this, this.pmJSON)

        this.xml = false

        this.rels = new DocxExporterRels(this, 'document')
        getDatabasesIfNeeded(this, doc, function() {
            that.images = new DocxExporterImages(that, that.imageDB, that.rels, that.pmJSON)
            that.citations = new DocxExporterCitations(that, that.bibDB, that.pmJSON)
            that.richtext = new DocxExporterRichtext(
                that,
                that.rels,
                that.citations,
                that.images
            )
            that.createFile()
        })
    }

    createPmJSON(doc) {
        let pmJSON = modelToEditor(doc).toJSON()
        // We remove those parts of the doc that are't enabled in the settings
        if (!doc.settings['metadata-subtitle']) {
            delete pmJSON.content[1].content
        }
        if (!doc.settings['metadata-authors']) {
            delete pmJSON.content[2].content
        }
        if (!doc.settings['metadata-abstract']) {
            delete pmJSON.content[3].content
        }
        if (!doc.settings['metadata-keywords']) {
            delete pmJSON.content[4].content
        }
        return pmJSON
    }


    createFile() {
        let that = this
        this.citations.formatCitations()
        this.pmBib = this.citations.pmBib
        this.xml = new XmlZip(createSlug(this.docTitle)+'.docx', staticUrl + 'docx/template.docx')

        this.xml.init().then(() => {
                return that.metadata.init()
            }).then(() => {
                return that.render.init()
            }).then(() => {
                return that.rels.init()
            }).then(() => {
                return that.images.init()
            }).then(() => {
                return that.footnotes.init()
            }).then(() => {
                that.render.getTagData(that.pmBib)
                that.render.render()
                that.xml.prepareAndDownload()
            })
    }

}