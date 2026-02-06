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
      text: `You are a product catalog extraction assistant for food & beverage trade. Analyze the catalog page images above and extract every product you can identify.

For each product, return a JSON object with ALL of these fields (set to null if not found):

{
  "brand": string or null,
  "product_name": string (required — product name in original language),
  "product_name_en": string or null (English product name if different),
  "description": string or null,
  "category": one of these slugs or null: ${JSON.stringify(CATEGORY_SLUGS)},

  "origin_country": string or null (country of origin),
  "manufacturer": string or null,

  "unit_spec": string or null (e.g. "330ml", "1.5L", "500g"),
  "unit_value": number or null (numeric part of unit_spec),
  "unit_measure": string or null (unit: "ml", "L", "g", "kg", "oz", etc.),
  "packaging_type": string or null (can/bottle/PET/pouch/jar/box/bag/tin),
  "packing_qty": number or null (units per case),

  "weight_kg": number or null (single unit weight in kg),
  "case_dimensions": { "length_cm": number or null, "width_cm": number or null, "height_cm": number or null } or null,
  "case_weight_kg": number or null,

  "shelf_life": string or null (e.g. "12 months", "2 years"),
  "storage_condition": string or null ("ambient", "chilled", "frozen"),
  "ingredients": string or null,
  "allergens": string[] or null (e.g. ["soy", "wheat", "milk"]),
  "certifications": string[] or null (e.g. ["HACCP", "Halal", "Kosher", "ISO22000", "Organic"]),

  "barcode": string or null (EAN/UPC if visible),
  "hs_code": string or null (HS code if mentioned),

  "currency": string or null (e.g. "USD", "EUR", "KRW"),
  "unit_price": number or null (price per unit, numeric only),
  "case_price": number or null (price per case, numeric only),
  "moq": string or null (minimum order quantity, e.g. "100 cases"),
  "price_basis": string or null (incoterm: "EXW", "FOB", "CIF", "DDP", "FCA"),
  "price_tiers": [{ "min_qty": number, "price": number }] or null
}

Rules:
- Extract ALL products visible in the images
- product_name is REQUIRED, all other fields are optional
- IMPORTANT: Do NOT include volume/weight/size in product_name. Strip specs like "500ml", "1L", "5L", "1kg" from the name and put them in unit_spec instead. Example: "Olive Oil 5L" → product_name:"Olive Oil", unit_spec:"5L"
- Similarly, strip packaging type from product_name and put in packaging_type. Example: "Olive Oil Lattina Tin 5L" → product_name:"Olive Oil", packaging_type:"tin", unit_spec:"5L"
- Convert all prices to numeric values (no currency symbols)
- Choose the most specific category slug that matches
- For unit_spec, parse both value and measure (e.g. "330ml" → unit_value:330, unit_measure:"ml")
- If a price range is shown, use the lower value for unit_price
- If unsure about a field, set it to null rather than guessing
- Return ONLY a JSON array of product objects, no other text
- Do NOT wrap in markdown code fences

${fileName ? `File name for context: ${fileName}` : ''}`,
    });

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192,
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
