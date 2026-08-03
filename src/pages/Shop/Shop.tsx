import { PageTransition } from "../../components/layout/PageTransition";
import { ShoppingBag, Star, Plus } from "lucide-react";
import { formatRupee } from "../../utils/currency";

const mockProducts: any[] = [];

export const Shop = () => {
  return (
    <PageTransition className="p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Pet Shop</h1>
          <p className="text-gray-500 font-medium">Premium food, toys, and accessories for your pets.</p>
        </div>
        <button className="bg-purple-100 text-purple-900 border border-purple-300 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-200 transition-colors shadow-2xs">
          <ShoppingBag size={18} /> Cart (0)
        </button>
      </div>

      {mockProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm w-full mt-8">
          <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No products available</h2>
          <p className="text-gray-500">Check back later for premium pet supplies.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mockProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow group cursor-pointer flex flex-col h-full">
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50 mb-4 relative">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-gray-900">
                  {product.category}
                </div>
              </div>
              
              <div className="flex-grow">
                <h3 className="font-bold text-gray-900 line-clamp-2 mb-1">{product.name}</h3>
                <div className="flex items-center gap-1 text-sm font-medium text-gray-500 mb-4">
                  <Star size={14} className="fill-purple-600 text-purple-600" /> {product.rating}
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <span className="font-black text-xl text-gray-900">{formatRupee(product.price * 80)}</span>
                <button className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors shadow-sm">
                  <Plus size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageTransition>
  );
};
