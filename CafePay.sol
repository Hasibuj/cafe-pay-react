// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title CafePay
/// @notice Lets cafe/restaurant owners register a shop, list menu items,
///         and accept USDC payments from customers. Owners pay a monthly
///         subscription fee to keep their shop active.
contract CafePay {

    // ===================== DATA STRUCTURES =====================

    struct MenuItem {
        uint256 id;
        string name;
        uint256 price;      // in USDC (6 decimals)
        bool active;
        bool isFamous;      // "famous" / featured items require a table number to order
    }

    struct Shop {
        string shopName;
        address ownerAddress;
        bool exists;
        uint256 subscriptionExpiry; // timestamp until which the shop is active
    }

    struct Order {
        uint256 orderId;
        address buyer;
        address shopOwner;
        uint256 itemId;
        string itemName;
        uint256 price;
        uint256 tableNumber; // 0 if not provided / not required
        uint256 timestamp;
    }

    // ===================== STATE =====================

    // Hardcoded USDC token used for both item payments and subscription fees
    IERC20 public constant usdcToken = IERC20(0x3600000000000000000000000000000000000000);

    uint256 public constant MONTHLY_FEE = 5 * 10**6;       // 5 USDC (6 decimals)
    uint256 public constant SUBSCRIPTION_PERIOD = 30 days;  // how long one payment covers
    uint256 public constant FREE_TRIAL_PERIOD = 30 days;    // free access window after registering

    address public platformOwner; // receives subscription fees, can withdraw them

    mapping(address => Shop) public shops;
    mapping(address => MenuItem[]) private shopMenus;

    uint256 public orderCounter;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) private shopOrderIds;
    mapping(address => uint256[]) private buyerOrderIds;

    address[] public allShops;

    // ===================== EVENTS =====================

    event ShopRegistered(address indexed owner, string shopName);
    event MenuItemAdded(address indexed owner, uint256 indexed itemId, string name, uint256 price, bool isFamous);
    event ItemPurchased(address indexed buyer, address indexed owner, uint256 indexed itemId, uint256 price, uint256 orderId, uint256 tableNumber);
    event SubscriptionPaid(address indexed owner, uint256 newExpiry);
    event FeesWithdrawn(address indexed to, uint256 amount);

    constructor() {
        platformOwner = msg.sender;
    }

    // ===================== MODIFIERS =====================

    modifier onlyShopOwner() {
        require(shops[msg.sender].exists, "Shop does not exist");
        _;
    }

    // ===================== CORE FUNCTIONS =====================

    function registerShop(string memory _shopName) external {
        require(!shops[msg.sender].exists, "Shop already exists");
        require(bytes(_shopName).length > 0, "Shop name cannot be empty");

        shops[msg.sender] = Shop({
            shopName: _shopName,
            ownerAddress: msg.sender,
            exists: true,
            subscriptionExpiry: block.timestamp + FREE_TRIAL_PERIOD // first month free
        });

        allShops.push(msg.sender);

        emit ShopRegistered(msg.sender, _shopName);
    }

    /// @param _isFamous mark true for popular/featured items that require a table number to order
    function addItem(string memory _name, uint256 _price, bool _isFamous) external onlyShopOwner {
        require(isShopActive(msg.sender), "Subscription expired: pay the monthly fee to re-enable the shop");
        require(bytes(_name).length > 0, "Item name cannot be empty");
        require(_price > 0, "Price must be greater than zero");

        uint256 itemId = shopMenus[msg.sender].length;
        shopMenus[msg.sender].push(MenuItem({
            id: itemId,
            name: _name,
            price: _price,
            active: true,
            isFamous: _isFamous
        }));

        emit MenuItemAdded(msg.sender, itemId, _name, _price, _isFamous);
    }

    /// @param _tableNumber required (must be > 0) if the item is marked "famous"; otherwise pass 0
    /// @return the new order's id
    function buyItem(address _shopOwner, uint256 _itemIndex, uint256 _tableNumber) external returns (uint256) {
        require(shops[_shopOwner].exists, "Shop does not exist");
        require(isShopActive(_shopOwner), "Shop is temporarily disabled: owner has not paid the monthly fee");
        require(_itemIndex < shopMenus[_shopOwner].length, "Invalid item index");

        MenuItem memory item = shopMenus[_shopOwner][_itemIndex];
        require(item.active, "Item is not active");

        if (item.isFamous) {
            require(_tableNumber > 0, "This item is famous: a table number is required to order it");
        }

        bool success = usdcToken.transferFrom(msg.sender, _shopOwner, item.price);
        require(success, "USDC transfer failed");

        orderCounter++;
        uint256 newOrderId = orderCounter;

        orders[newOrderId] = Order({
            orderId: newOrderId,
            buyer: msg.sender,
            shopOwner: _shopOwner,
            itemId: _itemIndex,
            itemName: item.name,
            price: item.price,
            tableNumber: _tableNumber,
            timestamp: block.timestamp
        });

        shopOrderIds[_shopOwner].push(newOrderId);
        buyerOrderIds[msg.sender].push(newOrderId);

        emit ItemPurchased(msg.sender, _shopOwner, _itemIndex, item.price, newOrderId, _tableNumber);

        return newOrderId;
    }

    // ===================== SUBSCRIPTION =====================

    /// @notice Shop owner pays 5 USDC to extend the shop's active period by 30 days.
    ///         Caller must approve this contract for at least MONTHLY_FEE USDC first.
    function payMonthlyFee() external onlyShopOwner {
        bool success = usdcToken.transferFrom(msg.sender, address(this), MONTHLY_FEE);
        require(success, "USDC payment failed");

        uint256 currentExpiry = shops[msg.sender].subscriptionExpiry;
        uint256 base = currentExpiry > block.timestamp ? currentExpiry : block.timestamp;
        shops[msg.sender].subscriptionExpiry = base + SUBSCRIPTION_PERIOD;

        emit SubscriptionPaid(msg.sender, shops[msg.sender].subscriptionExpiry);
    }

    /// @notice True if the shop exists and its subscription has not expired.
    ///         Once expired, addItem() and buyItem() are blocked until payMonthlyFee() is called again.
    function isShopActive(address _owner) public view returns (bool) {
        if (!shops[_owner].exists) return false;
        return block.timestamp <= shops[_owner].subscriptionExpiry;
    }

    /// @notice Platform owner withdraws collected subscription fees.
    function withdrawFees(uint256 _amount) external {
        require(msg.sender == platformOwner, "Not platform owner");
        bool success = usdcToken.transfer(platformOwner, _amount);
        require(success, "Withdraw failed");
        emit FeesWithdrawn(platformOwner, _amount);
    }

    // ===================== FRONTEND HELPER FUNCTIONS =====================
    // Convenience read-only functions so a frontend doesn't have to combine
    // several calls or re-implement logic (like checking active status) client-side.

    function getShopMenu(address _shopOwner) external view returns (MenuItem[] memory) {
        return shopMenus[_shopOwner];
    }

    /// @notice Same as getShopMenu but filters out deactivated items - handy for a public ordering page.
    function getActiveMenu(address _shopOwner) external view returns (MenuItem[] memory) {
        MenuItem[] memory all = shopMenus[_shopOwner];
        uint256 activeCount = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].active) activeCount++;
        }

        MenuItem[] memory activeItems = new MenuItem[](activeCount);
        uint256 j = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].active) {
                activeItems[j] = all[i];
                j++;
            }
        }
        return activeItems;
    }

    function getMenuItem(address _shopOwner, uint256 _itemIndex) external view returns (MenuItem memory) {
        require(_itemIndex < shopMenus[_shopOwner].length, "Invalid item index");
        return shopMenus[_shopOwner][_itemIndex];
    }

    function getMenuItemCount(address _shopOwner) external view returns (uint256) {
        return shopMenus[_shopOwner].length;
    }

    /// @notice One-call summary for a shop's profile/header on the frontend.
    function getShopDetails(address _owner) external view returns (
        string memory shopName,
        address ownerAddress,
        bool exists,
        bool active,
        uint256 subscriptionExpiry,
        uint256 itemCount,
        uint256 totalOrders
    ) {
        Shop memory shop = shops[_owner];
        return (
            shop.shopName,
            shop.ownerAddress,
            shop.exists,
            isShopActive(_owner),
            shop.subscriptionExpiry,
            shopMenus[_owner].length,
            shopOrderIds[_owner].length
        );
    }

    /// @notice For an owner-dashboard "pay now" banner / countdown.
    function getSubscriptionStatus(address _owner) external view returns (
        bool active,
        uint256 expiry,
        uint256 secondsRemaining
    ) {
        active = isShopActive(_owner);
        expiry = shops[_owner].subscriptionExpiry;
        secondsRemaining = expiry > block.timestamp ? expiry - block.timestamp : 0;
    }

    function getOrderDetails(uint256 _orderId) external view returns (Order memory) {
        require(_orderId > 0 && _orderId <= orderCounter, "Order does not exist");
        return orders[_orderId];
    }

    /// @notice All order ids for a given shop, e.g. for a kitchen/orders dashboard.
    function getShopOrderIds(address _owner) external view returns (uint256[] memory) {
        return shopOrderIds[_owner];
    }

    /// @notice All order ids for a given buyer, e.g. for an "order history" page.
    function getBuyerOrderIds(address _buyer) external view returns (uint256[] memory) {
        return buyerOrderIds[_buyer];
    }

    function getShopOrderCount(address _owner) external view returns (uint256) {
        return shopOrderIds[_owner].length;
    }

    function getAllShops() external view returns (address[] memory) {
        return allShops;
    }

    function getTotalShopCount() external view returns (uint256) {
        return allShops.length;
    }
}
