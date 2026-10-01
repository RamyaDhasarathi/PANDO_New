import { Property, PropertyType } from "@/data/properties";

// Define the expected structure from Dynamic Web Lab or dxbpropy.ai
export interface RealEstateApiConfig {
  baseUrl: string;
  apiKey: string;
}

export interface ApiPropertyResponse {
  id: string;
  title: string;
  community: string;
  sub_community?: string;
  property_type: string; // e.g. "Apartment" | "Villa"
  beds: number;
  baths: number;
  sale_price: number;
  size_sqft: number;
  makani_number?: string;
  latitude: number;
  longitude: number;
  images: string[];
  description?: string;
}

/**
 * Service to interact with the chosen Developer-Friendly REST API 
 * (Dynamic Web Lab / dxbpropy.ai).
 */
export class RealEstateApiService {
  private config: RealEstateApiConfig;

  constructor(config: RealEstateApiConfig) {
    this.config = config;
  }

  /**
   * Translates the external API property format into our internal Pando Property format.
   */
  private normalizeProperty(apiData: ApiPropertyResponse): Property {
    return {
      id: apiData.id,
      name: apiData.title,
      location: apiData.community,
      nearby: [], // This could be populated via a geo-radius lookup
      type: (apiData.property_type === "Villa" || apiData.property_type === "Townhouse") ? "Villa" : "Apartment",
      bedrooms: apiData.beds,
      bathrooms: apiData.baths,
      price: apiData.sale_price,
      rentPerYear: Math.round(apiData.sale_price * 0.05),
      areaSqft: apiData.size_sqft,
      image: apiData.images?.[0] || "/placeholder.jpg",
      tags: [],
      lifestyle: [],
      offPlan: false,
      amenities: [],
      description: apiData.description || "",
    };
  }

  /**
   * Search properties via the external API
   */
  async searchProperties(params: { location?: string; minPrice?: number; maxPrice?: number; type?: string }): Promise<Property[]> {
    try {
      const url = new URL(`${this.config.baseUrl}/v1/properties/search`);
      if (params.location) url.searchParams.append("community", params.location);
      if (params.minPrice) url.searchParams.append("min_price", params.minPrice.toString());
      if (params.maxPrice) url.searchParams.append("max_price", params.maxPrice.toString());
      if (params.type) url.searchParams.append("type", params.type);

      const response = await fetch(url.toString(), {
        headers: {
          "x-rapidapi-host": this.config.baseUrl.replace("https://", "").split("/")[0],
          "x-rapidapi-key": this.config.apiKey,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results.map((item: ApiPropertyResponse) => this.normalizeProperty(item));
    } catch (error) {
      console.error("Failed to fetch properties from external API:", error);
      return [];
    }
  }

  /**
   * Get full details for a single property
   */
  async getPropertyDetails(id: string): Promise<Property | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/properties/${id}`, {
        headers: {
          "x-rapidapi-host": this.config.baseUrl.replace("https://", "").split("/")[0],
          "x-rapidapi-key": this.config.apiKey,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeProperty(data.property);
    } catch (error) {
      console.error(`Failed to fetch property ${id}:`, error);
      return null;
    }
  }
}

// Singleton instance to be used across the app once API keys are provided
export const realEstateApi = new RealEstateApiService({
  baseUrl: process.env.NEXT_PUBLIC_REAL_ESTATE_API_URL || "https://api.dxbpropy.ai",
  apiKey: process.env.REAL_ESTATE_API_KEY || "TEST_KEY" // Backend only, or public if using via client
});
