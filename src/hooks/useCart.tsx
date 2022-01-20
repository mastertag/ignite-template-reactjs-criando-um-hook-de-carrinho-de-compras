import {createContext, ReactNode, useContext, useState} from 'react';
import {toast} from 'react-toastify';
import {api} from '../services/api';
import {Product, Stock} from '../types';
import axios from "axios";

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
    updateProductAmount: ({productId, amount}: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({children}: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem('@RocketShoes:cart');

        if (storagedCart) {
            return JSON.parse(storagedCart);
        }

        return [];
    });

    const addProduct = async (productId: number) => {
        try {
            const updatedCart = [...cart];
            let productFind = updatedCart.find(obj => obj.id == productId);
            const stock = await api.get<Stock>(`/stock/${productId}`);
            const stockAmount = stock.data.amount;
            const currentAmount = productFind ? productFind.amount: 0;
            const amount = currentAmount + 1;
            if(amount > stockAmount){
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }
            if (productFind) {
                productFind.amount = amount;
                await localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
                setCart([...updatedCart]);
            } else {
                const response = await api.get<Product>(`products/${productId}`);
                let productApi = response.data
                productApi.amount = amount;
                updatedCart.push(productApi);
                await localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
                setCart(updatedCart);
            }
        } catch {
            toast.error('Erro na adição do produto');
        }
    };

    const removeProduct = async (productId: number) => {
        try {
            const updatedCart = [...cart];
            let productIndex = updatedCart.findIndex(obj => obj.id === productId);
            if(productIndex !== -1){
                updatedCart.splice(productIndex,1);
                setCart([...updatedCart]);
                await localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
            }
            else{
                throw Error();
            }
        } catch {
            toast.error('Erro na remoção do produto');
        }
    };

    const updateProductAmount = async ({productId, amount,}: UpdateProductAmount) => {
        try {
            if(amount <=0){
                return;
            }
            const updatedCart = [...cart];
            let productFind = updatedCart.find(obj => obj.id === productId);

            const stock = await api.get<Stock>(`/stock/${productId}`);
            const stockAmount = stock.data.amount;
            if(amount > stockAmount){
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            // atualizar o item
            if (productFind) {
                productFind.amount= amount;
                await localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
                setCart([...updatedCart]);
            }
        } catch {
            toast.error('Erro na alteração de quantidade do produto');
        }
    };

    return (
        <CartContext.Provider
            value={{cart, addProduct, removeProduct, updateProductAmount}}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
    const context = useContext(CartContext);

    return context;
}
