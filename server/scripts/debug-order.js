
import http from 'http';

const postData = JSON.stringify({
    customerName: "Debug User",
    tableNumber: 1,
    beeperNumber: 5,
    paymentMethod: "Cash",
    amountTendered: 1000,
    changeAmount: 0,
    isTest: true,
    items: [
        {
            menuItem: {
                id: "1732959600000", // Needs a valid ID. I'll fetch one first.
                name: "Debug Burger",
                price: 150,
                type: "food"
            },
            quantity: 1,
            selectedFlavors: []
        }
    ]
});

const getMenu = () => {
    return new Promise((resolve) => {
        http.get('http://localhost:3000/api/menu', (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
    });
};

const run = async () => {
    try {
        console.log("Fetching menu item...");
        const menu = await getMenu();
        if (!menu.items || menu.items.length === 0) {
            console.error("No menu items found. Please add one.");
            return;
        }

        const item = menu.items[0];
        console.log("Using item:", item.name);

        const payload = JSON.stringify({
            customerName: "Debug User",
            tableNumber: 1,
            beeperNumber: 5,
            paymentMethod: "Cash",
            amountTendered: 1000,
            changeAmount: 0,
            isTest: true,
            items: [
                {
                    menuItem: {
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        type: item.type
                    },
                    quantity: 1,
                    selectedFlavors: []
                }
            ]
        });

        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/orders',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            console.log(`STATUS: ${res.statusCode}`);
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log('BODY:', data);
            });
        });

        req.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
        });

        req.write(payload);
        req.end();

    } catch (e) {
        console.error(e);
    }
};

run();
