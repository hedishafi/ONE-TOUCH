# Orders Feature - Frontend Implementation

## Files Created

### API Layer (`src/api/ordersApi.js`)
- `createOrder(formData)` - POST to create new order with voice/text
- `getOrder(id)` - GET order details
- `getMyOrders()` - GET client's orders list
- `getAvailableOrders()` - GET nearby available orders for provider
- `acceptOrder(id)` - POST provider accepts order
- `declineOrder(id)` - POST provider declines order
- `completeOrder(id)` - POST mark order complete
- `getStatusLog(id)` - GET order status audit trail

All functions include JWT authentication headers from localStorage.

### Reusable Components

**`src/components/orders/OrderStatusBadge.jsx`**
- Displays status badge with color coding
- Supports Amharic and English labels

**`src/components/orders/OrderCard.jsx`**
- Reusable order card component
- Shows order summary with status, category, date
- Clickable to view details

### Pages (Client Side)

**`src/pages/orders/CreateOrder.jsx`**
- Two tabs: Voice and Text input
- Voice recording with pulsing animation and timer
- Auto-detects client location via GPS
- Shows transcription with category/sub-service
- Loading and error states

**`src/pages/orders/MyOrders.jsx`**
- List of client's orders with status filtering
- Mobile responsive grid layout
- Empty state handling
- Click card to view details

**`src/pages/orders/OrderDetails.jsx`**
- Full order information display
- Status timeline with audit history
- Assignment info with provider details
- Mark as complete button if in_progress
- Back navigation

### Pages (Provider Side)

**`src/pages/orders/AvailableOrders.jsx`**
- Nearby available orders list
- Auto-refresh every 30 seconds
- Accept/Decline buttons on each order
- Shows distance and commission estimate
- Empty state handling

**`src/pages/orders/ActiveOrder.jsx`**
- Current accepted order details
- Location display with coordinates
- Commission fee and payment status
- Client contact shown only after commission paid
- Mark as In Progress / Complete buttons
- Auto-refresh every 10 seconds

## Integration Steps

### 1. Add Routes (in your main router)

```jsx
import { CreateOrder, MyOrders, OrderDetails, AvailableOrders, ActiveOrder } from './pages/orders';

// Add these routes
<Route path="/orders/create" element={<CreateOrder />} />
<Route path="/orders" element={<MyOrders />} />
<Route path="/orders/:id" element={<OrderDetails />} />
<Route path="/orders/available" element={<AvailableOrders />} />
<Route path="/orders/active/:id" element={<ActiveOrder />} />
```

### 2. Add Navigation Links

**Client Navigation:**
```jsx
<NavLink to="/orders/create">Create Order</NavLink>
<NavLink to="/orders">My Orders</NavLink>
```

**Provider Navigation:**
```jsx
<NavLink to="/orders/available">Available Orders</NavLink>
<NavLink to="/orders/active/:id">Active Order</NavLink>
```

### 3. Voice Recording Requirements

- Requires browser microphone permission
- Uses MediaRecorder API (works on all modern browsers)
- Audio recorded as WAV blob
- Tested on Chrome, Firefox, Safari

### 4. Localization

All components support Amharic (am) and English (en) via react-i18next:
- Language detection via `i18n.language`
- Amharic translations inline in components
- Date/time formatting with locale support

### 5. Authentication

JWT token required in localStorage as `access_token`:
```js
localStorage.setItem('access_token', token);
```

### 6. API Base URL

All API calls go to: `http://127.0.0.1:8000/api/`

Update in `src/api/ordersApi.js` if your backend is on different address.

## Component Props & Features

### OrderStatusBadge
```jsx
<OrderStatusBadge status="pending" />
```
- Status: pending, matching, accepted, in_progress, completed, cancelled, expired

### OrderCard
```jsx
<OrderCard order={orderObj} onClick={() => navigate(`/orders/${orderObj.id}`)} />
```
- Takes order object and click handler

## Styling

All components use **Mantine UI** (not Tailwind) with:
- Responsive design (mobile-first)
- Color schemes (blue, green, orange, red, yellow, gray)
- Loading states with spinners
- Error alerts with icons
- Badge components for status/category

## Error Handling

All pages include:
- Loading state during API calls
- Error alerts with user-friendly messages
- Amharic/English error messages
- Retry mechanisms (refresh buttons)

## Status Timeline

Order lifecycle displayed in OrderDetails:
```
pending → matching → accepted → in_progress → completed
                               ↘ cancelled
                  ↘ expired
```

## Mobile Responsive

- Container sizes: sm (90%), md (full)
- Grid layouts: base (1 col), sm (2 col), md (3 col)
- Touch-friendly buttons and form inputs
- Stack/Group for responsive spacing

## Next Steps

1. Add route definitions in main App.tsx/App.jsx
2. Test voice recording on mobile devices
3. Integrate commission payment flow (not implemented yet)
4. Add "Mark as In Progress" backend endpoint
5. Add location display on map (using leaflet/google maps)
6. Test all API integrations with backend
