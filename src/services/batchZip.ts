import JSZip from "jszip";

export class BatchZipBuilder {
  private readonly zip = new JSZip();

  addPdf(fileName: string, content: Uint8Array) {
    this.zip.file(fileName, content);
  }

  async toUint8Array(): Promise<Uint8Array> {
    return this.zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  }
}
