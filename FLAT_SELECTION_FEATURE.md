# Flat Selection Feature for Resident Dashboard

## Overview
The Resident Dashboard now includes a selectable flat number and building system for new residents during profile completion. This feature provides a user-friendly interface for residents to select their building and flat from available options.

## Features

### 1. Building Selection
- Dropdown menu with all available buildings
- Shows building count when loaded
- Disabled state while loading
- Validation to ensure valid building selection

### 2. Flat Selection
- Dynamic dropdown that populates based on selected building
- Shows detailed flat information including:
  - Flat number
  - Floor number
  - Area (sq ft)
  - Bedrooms and bathrooms
- Sorted by floor and flat number
- Disabled until building is selected
- Shows count of available flats

### 3. Flat Details Display
- Shows selected flat details in a highlighted box
- Includes amenities information
- Real-time updates when flat selection changes

### 4. Validation
- Building must be selected from available options
- Flat must be available in the selected building
- Real-time validation feedback
- Error messages for invalid selections

## Technical Implementation

### New Service: `flatService.js`
- `getBuildings()` - Fetches available buildings
- `getFlatsByBuilding(buildingId)` - Gets flats for specific building
- `getAllFlats()` - Gets all available flats
- `checkFlatAvailability()` - Checks if flat is available
- `getFlatDetails()` - Gets detailed flat information
- Fallback to default data when API is unavailable

### State Management
- `buildings` - Array of available buildings
- `availableFlats` - Array of all available flats
- `flatsLoading` - Loading state for flat data

### Key Functions
- `handleBuildingChange()` - Handles building selection, resets flat, and generates flats dynamically
- `getFlatsForBuilding()` - Filters and sorts flats for selected building
- `generateFlatNumber()` - Creates flat numbers based on building pattern
- `getBuildingAmenities()` - Returns building-specific amenities

## Dynamic Flat Generation
The system now generates flat numbers dynamically based on the selected building structure:

### Buildings with Different Configurations
- **Building A**: 4 floors, 6 flats per floor (101-106, 201-206, 301-306, 401-406)
- **Building B**: 3 floors, 4 flats per floor (101-104, 201-204, 301-304)
- **Building C**: 5 floors, 8 flats per floor (101-108, 201-208, 301-308, 401-408, 501-508)

### Flat Number Generation Pattern
- Floor number + Flat position (e.g., Floor 1, Flat 1 = 101)
- Padded with zeros for consistency (101, 102, 103, etc.)
- Building-specific configurations determine total flats

### Flat Properties
- `id`: Unique identifier (e.g., "A-101")
- `building`: Building ID (A, B, C)
- `flatNumber`: Generated flat number (101, 102, etc.)
- `floor`: Floor number (1, 2, 3, 4, 5)
- `area`: Building-specific area (Building A: 1200 sq ft, B: 1000 sq ft, C: 1500 sq ft)
- `bedrooms`: Building-specific bedrooms (Building A: 3, B: 2, C: 3)
- `bathrooms`: Building-specific bathrooms (Building A: 2, B: 2, C: 3)
- `amenities`: Building-specific amenities
  - Building A: ["Parking", "Balcony", "Power Backup", "Gym", "Swimming Pool"]
  - Building B: ["Parking", "Balcony", "Power Backup", "Garden"]
  - Building C: ["Parking", "Balcony", "Power Backup", "Gym", "Swimming Pool", "Club House", "Security"]
- `available`: Availability status (default: true)

## User Experience Improvements

### Visual Feedback
- Loading states for both dropdowns
- Success messages showing counts
- Error messages for validation failures
- Detailed flat information display

### Accessibility
- Proper labels for screen readers
- Disabled states clearly indicated
- Clear error messaging
- Logical tab order

### Responsive Design
- Works on mobile and desktop
- Proper spacing and sizing
- Dark mode support

## Usage

1. **New Resident Login**: When a new resident logs in, they see the profile completion modal
2. **Building Selection**: Resident selects their building from the dropdown
3. **Flat Selection**: Flat dropdown becomes enabled and shows available flats
4. **Flat Details**: Selected flat details are displayed below the dropdown
5. **Validation**: System validates selections before allowing profile save
6. **Save**: Resident can save their profile with the selected building and flat

## API Integration

The system is designed to work with a backend API but includes fallback functionality:

- **Primary**: Uses API endpoints for real-time data
- **Fallback**: Uses default data structure when API is unavailable
- **Error Handling**: Graceful degradation with user feedback

## Future Enhancements

1. **Real-time Availability**: Live updates when flats become available/unavailable
2. **Flat Images**: Display flat photos in the selection interface
3. **Pricing Information**: Show rent/purchase prices if applicable
4. **Advanced Filtering**: Filter by amenities, size, etc.
5. **Favorites**: Allow residents to save favorite flats
6. **Waitlist**: Join waitlist for unavailable flats

## Testing

The feature includes:
- Fallback data for testing without API
- Error handling for network issues
- Validation testing for edge cases
- Responsive design testing
- Accessibility testing

## Dependencies

- React hooks (useState, useEffect, useMemo)
- Lucide React icons
- Tailwind CSS for styling
- Custom flatService for API integration
