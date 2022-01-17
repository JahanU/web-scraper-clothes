import React, { useEffect, useState } from 'react';
import './App.css';
import { getItemsService } from './services/webScrape.service'
import ItemTable from './component/ItemTable';
import Item from './interfaces/Item';
import HeaderBar from './component/HeaderBar';
import Error from './component/Error';

export default function App() {

  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setLoading(true);
    getItemsService()
      .then((items: Item[]) => {
        if (items.length === 0 || items === undefined) {
          setIsError(true);
        }
        setItems(items);
      })
      .catch((err: any) => {
        console.log(err);
        setIsError(true);
      })
      .finally(() =>
        setLoading(false));
  }, []) // Whenever items change


  const onSliderChange = (discount: number) => {
    setFilteredItems(items.filter((item: Item) => item.discount >= discount));
  }

  return (
    <div className="App">
      <HeaderBar onSliderChange={onSliderChange} />
      {isError && <Error />}
      {!isError && !filteredItems.length && <ItemTable items={items} isLoading={loading} />}
      {!isError && filteredItems.length && <ItemTable items={filteredItems} isLoading={loading} />}
    </div>
  );
}

