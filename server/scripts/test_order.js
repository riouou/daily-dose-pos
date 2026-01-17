
const testOrder = async () => {
    try {
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
        console.log("Response:", data);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
};
testOrder();
