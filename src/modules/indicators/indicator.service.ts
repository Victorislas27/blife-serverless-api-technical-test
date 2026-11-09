import { IndicatorRepository } from "./indicator.repository";
import {
  TopProductsFilterDto,
  ProfitabilityFilterDto,
  TopChannelsFilterDto,
  RecommendationsFilterDto,
  TopProductItem,
  ProfitabilitySummary,
  ChannelPerformanceItem,
  RecommendedProductItem,
} from "./indicator.types";

export class IndicatorService {
  constructor(private indicatorRepository = new IndicatorRepository()) {}

  async getTopProducts(
    filters: TopProductsFilterDto,
  ): Promise<TopProductItem[]> {
    return await this.indicatorRepository.getTopSellingProducts(filters);
  }
  async getProfitability(
    filters: ProfitabilityFilterDto,
  ): Promise<ProfitabilitySummary> {
    return await this.indicatorRepository.getProfitability(filters);
  }
  async getTopChannels(
    filters: TopChannelsFilterDto,
  ): Promise<ChannelPerformanceItem[]> {
    return await this.indicatorRepository.getTopChannels(filters);
  }
  async getRecommendations(
    filters: RecommendationsFilterDto,
  ): Promise<RecommendedProductItem[]> {
    const limit = Math.max(1, Math.min(20, filters.limit || 4));

    if (filters.productId) {
      const crossSelling =
        await this.indicatorRepository.getRecommendationsByProductId(
          filters.productId,
          limit,
        );
      if (crossSelling.length >= limit) {
        return crossSelling;
      }
      const needed = limit - crossSelling.length;
      const alreadyRecommended = new Set(crossSelling.map((r) => r.productId));
      alreadyRecommended.add(filters.productId);
      const popular = await this.indicatorRepository.getPopularRecommendations(
        filters.category,
        needed + alreadyRecommended.size,
        filters.productId,
      );
      const filteredPopular = popular.filter(
        (p) => !alreadyRecommended.has(p.productId),
      );
      return [...crossSelling, ...filteredPopular.slice(0, needed)];
    }
    return await this.indicatorRepository.getPopularRecommendations(
      filters.category,
      limit,
    );
  }
}
