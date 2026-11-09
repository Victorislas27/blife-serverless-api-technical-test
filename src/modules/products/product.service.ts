import { ProductRepository } from './product.repository';
import { CreateProductDto, UpdateProductDto, ProductFilterDto, Product, ProductVariant } from './product.types';
import { BadRequestError, NotFoundError, ConflictError } from '../../common/errors';

export class ProductService {
  constructor(private productRepository = new ProductRepository()) {}

  async createProduct(dto: CreateProductDto): Promise<Product> {
    if (!dto.name || dto.name.trim() === '') {
      throw new BadRequestError('El nombre del producto es obligatorio.');
    }
    if (!dto.category || dto.category.trim() === '') {
      throw new BadRequestError('La categoría del producto es obligatoria.');
    }
    if (!dto.variants || dto.variants.length === 0) {
      throw new BadRequestError('El producto debe contener al menos una variante con SKU definido.');
    }

    const skuSet = new Set<string>();
    for (const variant of dto.variants) {
      if (!variant.sku || variant.sku.trim() === '') {
        throw new BadRequestError('Cada variante debe tener un código SKU válido.');
      }

      const normalizedSku = variant.sku.trim().toUpperCase();
      if (skuSet.has(normalizedSku)) {
        throw new BadRequestError(`El SKU "${normalizedSku}" está duplicado en la lista de variantes enviada.`);
      }
      skuSet.add(normalizedSku);

      if (variant.price < 0 || variant.cost < 0) {
        throw new BadRequestError(`El precio y el costo de la variante "${variant.sku}" no pueden ser negativos.`);
      }
      if (variant.stock < 0 || !Number.isInteger(variant.stock)) {
        throw new BadRequestError(`El stock de la variante "${variant.sku}" debe ser un número entero no negativo.`);
      }

      const existsInDb = await this.productRepository.skuExists(normalizedSku);
      if (existsInDb) {
        throw new ConflictError(`El SKU "${normalizedSku}" ya se encuentra registrado por otro producto.`);
      }
    }

    return await this.productRepository.create(dto);
  }

  async getProductById(id: string): Promise<Product> {
    if (!id || id.trim() === '') {
      throw new BadRequestError('Se requiere un ID de producto válido.');
    }
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError(`Producto con ID "${id}" no encontrado.`);
    }
    return product;
  }

  async getProductBySku(sku: string): Promise<{ product: Product; variant: ProductVariant }> {
    if (!sku || sku.trim() === '') {
      throw new BadRequestError('Se requiere un código SKU para realizar la búsqueda.');
    }
    const result = await this.productRepository.findBySku(sku);
    if (!result) {
      throw new NotFoundError(`No se encontró ninguna variante con el SKU "${sku}".`);
    }
    return result;
  }

  async listProducts(filters: ProductFilterDto) {
    return await this.productRepository.findAll(filters);
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.getProductById(id);

    if (dto.variants && dto.variants.length > 0) {
      const skuSet = new Set<string>();
      for (const variant of dto.variants) {
        const normalizedSku = variant.sku.trim().toUpperCase();
        if (skuSet.has(normalizedSku)) {
          throw new BadRequestError(`El SKU "${normalizedSku}" está duplicado en la lista enviada.`);
        }
        skuSet.add(normalizedSku);

        const existsInDb = await this.productRepository.skuExists(normalizedSku, variant.id);
        if (existsInDb) {
          throw new ConflictError(`El SKU "${normalizedSku}" ya está registrado en otra variante.`);
        }
      }
    }

    const updated = await this.productRepository.update(id, dto);
    if (!updated) {
      throw new NotFoundError(`Producto con ID "${id}" no encontrado para actualizar.`);
    }
    return updated;
  }
  async deleteProduct(id: string): Promise<{ message: string; deletedId: string }> {
    await this.getProductById(id);
    const deleted = await this.productRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`No se pudo eliminar el producto con ID "${id}".`);
    }
    return {
      message: 'Producto y variantes eliminados correctamente.',
      deletedId: id,
    };
  }
}
