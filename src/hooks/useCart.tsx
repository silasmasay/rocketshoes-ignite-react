import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartProduct = cart.find((product) => product.id === productId);

      if (!cartProduct) {
        const { data: product } = await api.get<Product>(`products/${productId}`);

        const newListProducts = [
          ...cart,
          {
            ...product,
            amount: 1
          }
        ] 

        setCart(newListProducts);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newListProducts));
      } else {
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount - cartProduct.amount > 0) {
          const updateAmountProduct = cart.map((product) => (
            product.id === productId 
              ? { ...product, amount: product.amount + 1 }
              : product
            ));

          setCart(updateAmountProduct);

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateAmountProduct));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newListProducts = cart.filter((product) => product.id !== productId);

      if (newListProducts.length === cart.length) {
        throw new Error();
      }

      setCart(newListProducts);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newListProducts));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      
      if (stock.amount - amount >= 0) {
        const updateAmountProduct = cart.map((product) => (
          product.id === productId 
            ? { ...product, amount }
            : product
        ));

        setCart(updateAmountProduct);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateAmountProduct));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
