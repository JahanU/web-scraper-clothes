import cheerio from 'cheerio';
const axios = require('axios');
const filterData = require('./filterData');
import { Item } from "../interfaces/Item";

let seenItemsCache = new Set<string>(); // stores url 

const JD = 'https://www.jdsports.co.uk';
const urls = [ // JD_ALL_MEN, SHOES 
    'https://www.jdsports.co.uk/men/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,tommy-hilfiger,calvin-klein-underwear,levis,columbia,jordan,emporio-armani-ea7,berghaus,polo-ralph-lauren,boss,champion,fred-perry,asics/sale/?sort=price-low-high&max=200',
    'https://www.jdsports.co.uk/men/mens-footwear/brand/adidas-originals,adidas,nike,under-armour,the-north-face,new-balance,lacoste,vans,tommy-hilfiger,calvin-klein-underwear,levis,columbia,reebok,jordan,fila,emporio-armani-ea7,puma,berghaus,polo-ralph-lauren,boss,champion,fred-perry,asics,converse/sale/?max=100&sort=price-low-high&max=200'
];

function JDMain(discountLimit: number): Promise<Item[]> {
    setInterval(resetCache, 10800 * 1000); // reset cache every 3h
    return getJDItems(discountLimit);
}

const resetCache = () => seenItemsCache = new Set<string>();

function getJDItems(discountLimit: number): Promise<Item[]> {

    const items: Item[] = [];

    return new Promise<Item[]>((resolve, reject) => {
        Promise.all(
            urls.map(async (url) => {

                const html = await axios.get(url);
                const $ = cheerio.load(html.data);

                $('.productListItem').each((index, element) => {

                    const url = JD + $(element).find('a').attr('href');
                    if (seenItemsCache.has(url)) return; // don't add items we've already seen
                    seenItemsCache.add(url);
                    console.log('!Added, ', seenItemsCache.size);

                    let discount = parseInt($(element).find('.sav').text().trim().substring(5, 7));
                    console.log('discount: ', discount);
                    if (discount < discountLimit) return; // don't care about items with less than 50% discount

                    const name = $(element).find('.itemTitle').text().trim().toLowerCase();
                    if (filterData(name)) return; // Don't like item, continue searching

                    const imageUrl = $(element).find('source').attr('data-srcset')?.split(' ')[2]; // => [smallImgUrl, 1x, largeImgUrl, 2x];
                    const wasPrice = $(element).find('.was').text().substring(3).trim();
                    const nowPrice = $(element).find('.now').text().substring(3).trim();

                    items.push({ name, wasPrice, nowPrice, discount, url, imageUrl });
                });

                if (!items.length) reject('No items found from JD');
                return items;
            })
        ).then(async (items: Item[][]) => {
            const detailedItems = await getStockAndSize(items.flat());
            if (!detailedItems.length) reject('Nothing in stock');
            return resolve(detailedItems);
        }).catch((err: Error) => {
            return reject(err);
        });
    });
}

async function getStockAndSize(items: Item[]): Promise<Item[]> { // get size and if in stock, remove those not in stock

    console.log('getting stock and size: ', items.length);
    return new Promise<Item[]>((resolve, reject) => {
        Promise.all(
            items.map(async (item) => {
                const html = await axios.get(item.url);
                const $ = cheerio.load(html.data);

                console.log('getting stock and size: ', item.name);
                // get stock
                const metaTag = $('meta')[28] as cheerio.TagElement;
                const inStock = metaTag.attribs.content;
                if (inStock === 'OUT OF STOCK') return;

                // get sizes
                const scriptTag = $('script')[3] as cheerio.TagElement;
                const objectStr = scriptTag.children[0].data!;
                const regex = /name:("\w+")/g;
                const sizes = [...objectStr.matchAll(regex)].map((i) => i[1].substring(1, i[1].length - 1));
                if (!sizes.length) return;

                return { ...item, sizes, inStock };
            })
        ).then((items) => {
            return resolve(items.filter((item) => item !== undefined));
        }).catch((err) => {
            return reject(err);
        });
    });
}

export default JDMain;