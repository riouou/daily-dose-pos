
const testTakeOut = async () => {
    try {
        console.log("Testing Take Out Order...");
        const res = await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{
                    menuItem: { id: "1767535990212", name: "Cappucino [CP]", price: 89, category: "Test" },
                    quantity: 1
                }],
                total: 89,
                paymentMethod: "Cash",
                orderType: "take-out",
                isTest: true
            })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Order Type in Response:", data.orderType);

        if (data.orderType !== 'take-out') {
            console.error("FAIL: Expected 'take-out', got", data.orderType);
        } else {
            console.log("SUCCESS: Order created as 'take-out'");
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
};
testTakeOut();
