export const validators = {
  isValidBarcode: (code) => {
    const cleaned = code.replace(/[^0-9]/g, '');
    if (cleaned.length !== 11) return false;
    const numericCode = parseInt(cleaned, 10);
    return numericCode > 44000000000;
  },
  cleanQRCode: (data) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.id && typeof parsed.id === 'string') {
        return parsed.id.replace(/[^0-9]/g, '').slice(0, 11);
      }
    } catch (e) {
      return data.replace(/[^0-9]/g, '').slice(0, 11);
    }
    return data.replace(/[^0-9]/g, '').slice(0, 11);
  },
  isValidRouteNumber: (number) => {
    const num = parseInt(number, 10);
    return !isNaN(num) && num > 0 && num <= 999;
  },
  extractRouteNumber: (routeName) => {
    const matches = routeName.match(/\d+$/);
    return matches ? parseInt(matches[0], 10) : null;
  }
};