import { SaleRepository } from './sale.repository';
import { CreateSaleDto, SaleFilterDto, Sale } from './sale.types';
import { BadRequestError, NotFoundError } from '../../common/errors';

export class SaleService {
  constructor(private saleRepository = new SaleRepository()) {}

  async createSale(dto: CreateSaleDto): Promise<Sale> {
    if (!dto.channel || dto.channel.trim() === '') {
      throw new BadRequestError('El canal de venta es obligatorio (e.g. AMAZON_MX, MERCADOLIBRE, BLIFE_SHOPIFY).');
    }

    if (!dto.customerName || dto.customerName.trim() === '') {
      throw new BadRequestError('El nombre del cliente es obligatorio.');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestError('La orden de venta debe contener al menos un producto/variante.');
    }

    for (const item of dto.items) {
      if (!item.sku || item.sku.trim() === '') {
        throw new BadRequestError('Cada item debe especificar un SKU válido.');
      }
      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        throw new BadRequestError(`La cantidad para el SKU "${item.sku}" debe ser un entero positivo.`);
      }
    }

    return await this.saleRepository.create(dto);
  }

  async getSaleById(id: string): Promise<Sale> {
    if (!id || id.trim() === '') {
      throw new BadRequestError('Se requiere un ID de venta válido.');
    }
    const sale = await this.saleRepository.findById(id);
    if (!sale) {
      throw new NotFoundError(`Venta con ID "${id}" no encontrada.`);
    }
    return sale;
  }

  async listSales(filters: SaleFilterDto) {
    return await this.saleRepository.findAll(filters);
  }
}
