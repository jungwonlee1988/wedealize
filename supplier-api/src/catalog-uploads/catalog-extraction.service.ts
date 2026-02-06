import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class CatalogExtractionService {
  private readonly logger = new Logger(CatalogExtractionService.name);
  private anthropic: Anthropic;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('anthropic.apiKey');
    this.anthropic = new Anthropic({ apiKey });
  }

  async extractProducts(images: { data: string; pageNumber?: number }[], fileName?: string) {
    const CATEGORY_SLUGS = [
      'evoo','olive-oil','seed-oils','nut-oils','truffle-oil',
      'balsamic','wine-vinegar','sauces','mustard-dressings',
      'hard-cheese','soft-cheese','aged-cheese','butter-cream',
      'cured-meats','sausages','smoked-meats',
      'dried-pasta','fresh-pasta','rice','flour-semolina',
      'bread','biscuits-cookies','chocolate','pastries',
      'tomato-products','pickles-olives','preserved-veg','jams-spreads',
      'wine','spirits','coffee','tea','juices-soft',
      'fresh-fish','canned-fish','shellfish','smoked-fish',
      'spice-blends','herbs','honey',
      'nuts-dried-fruit','chips-crackers','bars',
      'organic','gluten-free','vegan-plant','frozen',
    ];

    const content: Anthropic.Messages.ContentBlockParam[] = [];

    // Add each image
    for (const img of images) {
      const base64 = img.data.replace(/^data:image\/\w+;base64,/, '');
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: base64,
        },
      });
    }

    // Add extraction prompt
    content.push({
      type: 'text',
      text: `You are a product catalog extraction assistant. Analyze the catalog page images above and extract every product you can identify.

For each product, return a JSON object with these fields:
- "name": string (product name, required)
- "sku": string or null (product code/SKU if visible)
- "category": one of these slugs or null: ${JSON.stringify(CATEGORY_SLUGS)}
- "minPrice": number or null (minimum price, numeric only)
- "maxPrice": number or null (maximum price, numeric only)
- "priceBasis": string or null (price basis/incoterm if mentioned: "EXW", "FOB", "CIF", "DDP", "FCA", etc.)
- "shelfLife": string or null (shelf life/expiry info if mentioned, e.g. "12 months", "2 years", "24M")

Rules:
- Extract ALL products visible in the images
- If a price range is shown (e.g. "$7.20 - $8.50"), set minPrice=7.20 and maxPrice=8.50
- If only one price is shown, set both minPrice and maxPrice to that value
- Convert all prices to numeric values (no currency symbols)
- Choose the most specific category slug that matches
- If unsure about a field, set it to null
- Return ONLY a JSON array of product objects, no other text
- Do NOT wrap in markdown code fences

${fileName ? `File name for context: ${fileName}` : ''}`,
    });

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        this.logger.warn('No text response from Claude');
        return [];
      }

      let raw = textBlock.text.trim();

      // Strip markdown fences if present
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      const products = JSON.parse(raw);
      if (!Array.isArray(products)) {
        this.logger.warn('Response is not an array');
        return [];
      }

      return products;
    } catch (error) {
      this.logger.error('Claude extraction failed:', error);
      throw error;
    }
  }
}
