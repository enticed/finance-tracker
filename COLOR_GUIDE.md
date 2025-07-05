# Tailwind CSS Color Guide for Finance Tracker

## Quick Color Changes

### Background Colors
```jsx
// Light backgrounds
className="bg-white"                    // Pure white
className="bg-gray-50"                  // Very light gray
className="bg-blue-50"                  // Very light blue
className="bg-gradient-to-br from-blue-50 to-indigo-100"  // Gradient

// Dark backgrounds
className="bg-gray-900"                 // Very dark gray
className="bg-dark-800"                 // Custom dark color
className="bg-gradient-to-br from-dark-800 to-dark-900"   // Dark gradient

// Glass morphism effect
className="bg-white/80 backdrop-blur-sm"  // Semi-transparent with blur
```

### Text Colors
```jsx
// Light theme text
className="text-gray-900"               // Dark text
className="text-gray-700"               // Medium dark text
className="text-gray-500"               // Medium gray text
className="text-gray-400"               // Light gray text

// Custom colors
className="text-finance-600"            // Custom blue
className="text-success-500"            // Green for positive
className="text-danger-500"             // Red for negative

// Gradient text
className="bg-gradient-to-r from-finance-600 to-finance-800 bg-clip-text text-transparent"
```

### Component Colors

#### Cards
```jsx
// Light theme card
className="bg-white p-6 rounded-xl shadow-lg border border-white/20"

// Dark theme card
className="bg-dark-700/80 backdrop-blur-sm border-dark-600"

// Glass morphism card
className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20"
```

#### Buttons
```jsx
// Primary button
className="bg-finance-600 text-white hover:bg-finance-700"

// Gradient button
className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"

// Success button
className="bg-success-500 text-white hover:bg-success-600"

// Danger button
className="bg-danger-500 text-white hover:bg-danger-600"
```

#### Form Elements
```jsx
// Input fields
className="border-gray-300 focus:ring-finance-500 focus:border-finance-500"

// Labels
className="text-gray-700"  // Light theme
className="text-dark-100"  // Dark theme
```

## Custom Color Palette

### Finance Colors (Custom)
- `finance-50` to `finance-900`: Blue gradient for primary branding
- Use for: Headers, primary buttons, links

### Success Colors (Custom)
- `success-50` to `success-900`: Green gradient for positive actions
- Use for: Positive balances, success messages, confirmations

### Danger Colors (Custom)
- `danger-50` to `danger-900`: Red gradient for negative actions
- Use for: Negative balances, errors, warnings

### Dark Colors (Custom)
- `dark-50` to `dark-900`: Neutral dark gradient
- Use for: Dark theme backgrounds and text

## Theme Switching

### Conditional Classes
```jsx
// Dynamic background
className={`${
    isDarkMode 
        ? 'bg-gradient-to-br from-dark-800 to-dark-900 text-dark-100' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'
}`}

// Dynamic card styling
className={`${
    isDarkMode 
        ? 'bg-dark-700/80 backdrop-blur-sm border-dark-600' 
        : 'bg-white/80 backdrop-blur-sm border-white/20'
} p-6 rounded-xl shadow-lg border`}
```

### Color Variables
```jsx
// Balance colors based on theme
const balanceColor = account.balance >= 0 
    ? (isDarkMode ? 'text-success-400' : 'text-gray-800') 
    : 'text-danger-500';
```

## Advanced Techniques

### Opacity and Transparency
```jsx
className="bg-white/80"        // 80% opacity white
className="bg-black/10"        // 10% opacity black
className="border-white/20"    // 20% opacity white border
```

### Backdrop Blur
```jsx
className="backdrop-blur-sm"   // Small blur
className="backdrop-blur-md"   // Medium blur
className="backdrop-blur-lg"   // Large blur
```

### Gradients
```jsx
// Linear gradients
className="bg-gradient-to-r from-blue-500 to-purple-500"    // Right
className="bg-gradient-to-br from-blue-500 to-purple-500"   // Bottom-right
className="bg-gradient-to-t from-blue-500 to-purple-500"    // Top

// Radial gradients
className="bg-gradient-radial from-blue-500 to-purple-500"
```

### Shadows
```jsx
className="shadow-sm"          // Small shadow
className="shadow-md"          // Medium shadow
className="shadow-lg"          // Large shadow
className="shadow-xl"          // Extra large shadow
```

## Best Practices

1. **Consistency**: Use the same color palette throughout your app
2. **Accessibility**: Ensure sufficient contrast ratios (4.5:1 minimum)
3. **Semantic Colors**: Use colors that match their meaning (green for success, red for errors)
4. **Theme Support**: Always provide both light and dark variants
5. **Transitions**: Add smooth transitions when switching themes

## Quick Reference

### Common Patterns
```jsx
// Glass morphism card
className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20"

// Modern button
className="bg-gradient-to-r from-finance-600 to-purple-600 text-white py-2 px-4 rounded-md shadow-lg hover:from-finance-700 hover:to-purple-700 transition-all duration-200"

// Dark mode text
className={isDarkMode ? 'text-dark-100' : 'text-gray-800'}

// Conditional background
className={isDarkMode ? 'bg-dark-800' : 'bg-white'}
``` 