declare module "mammoth" {
  interface ExtractionMessage {
    type: "warning" | "error";
    message: string;
  }

  interface ExtractionResult {
    value: string;
    messages: ExtractionMessage[];
  }

  const mammoth: {
    extractRawText(input: { buffer: Buffer }): Promise<ExtractionResult>;
  };

  export default mammoth;
}
