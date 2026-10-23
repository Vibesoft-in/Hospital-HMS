import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

Handlebars.registerHelper("increment", function (value: number) {
  return value + 1;
});

Handlebars.registerHelper(
  "flagValue",
  function (
    _numberValue: number | null,
    _stringValue: string | null,
    _appliedReferenceRange: any
  ) {
    // Always return empty string - L and H flags removed
    return "";
  }
);

Handlebars.registerHelper(
  "whatsappFlagClass",
  function (
    numberValue: number | null,
    stringValue: string | null,
    appliedReferenceRange: any
  ) {
    if (stringValue !== "" && stringValue != null && !Number.isNaN(Number(stringValue))) {
      numberValue = Number(stringValue);
    }
    if (numberValue != null && appliedReferenceRange) {
      if (numberValue < appliedReferenceRange.lowValue) return "flag-low";
      if (numberValue > appliedReferenceRange.highValue) return "flag-high";
    }
    return "";
  }
);

Handlebars.registerHelper(
  "whatsappFlagValue",
  function (
    numberValue: number | null,
    stringValue: string | null,
    appliedReferenceRange: any
  ) {
    if (
      stringValue !== "" &&
      stringValue != null &&
      !Number.isNaN(Number(stringValue))
    ) {
      numberValue = Number(stringValue);
    }
    if (
      numberValue != null &&
      numberValue != undefined &&
      appliedReferenceRange
    ) {
      if (numberValue < appliedReferenceRange.lowValue) return "L";
      else if (numberValue > appliedReferenceRange.highValue) return "H";
    }

    return "";
  }
);

Handlebars.registerHelper(
  "conditionalFlagValue",
  function (
    _numberValue: number | null,
    _stringValue: string | null,
    _appliedReferenceRange: any,
    _showColors: boolean
  ) {
    // H/L letters removed — color is shown on the value itself
    return "";
  }
);

Handlebars.registerHelper(
  "conditionalFlagClass",
  function (
    numberValue: number | null,
    stringValue: string | null,
    appliedReferenceRange: any,
    showColors: boolean
  ) {
    if (!showColors) return "";
    
    if (
      stringValue !== "" &&
      stringValue != null &&
      !Number.isNaN(Number(stringValue))
    ) {
      numberValue = Number(stringValue);
    }
    if (
      numberValue != null &&
      numberValue != undefined &&
      appliedReferenceRange
    ) {
      if (numberValue < appliedReferenceRange.lowValue) return "flag-low";
      else if (numberValue > appliedReferenceRange.highValue) return "flag-high";
    }

    return "";
  }
);

Handlebars.registerHelper(
  "conditionalFlagStyle",
  function (
    numberValue: number | null,
    stringValue: string | null,
    appliedReferenceRange: any,
    showColors: boolean
  ) {
    if (!showColors) return "";
    if (stringValue !== "" && stringValue != null && !Number.isNaN(Number(stringValue))) {
      numberValue = Number(stringValue);
    }
    if (numberValue != null && numberValue != undefined && appliedReferenceRange) {
      if (numberValue < appliedReferenceRange.lowValue) return "color:#0066cc;font-weight:700;";
      else if (numberValue > appliedReferenceRange.highValue) return "color:#cc1100;font-weight:700;";
    }
    return "";
  }
);

Handlebars.registerHelper(
  "possibleStringFlagStyle",
  function (showColors: boolean) {
    if (!showColors) return "";
    return "color:#0066cc;font-weight:700;";
  }
);

Handlebars.registerHelper(
  "isOutOfRange",
  function (
    numberValue: number | null,
    stringValue: string | null,
    appliedReferenceRange: any
  ) {
    if (
      stringValue !== "" &&
      stringValue != null &&
      !Number.isNaN(Number(stringValue))
    ) {
      numberValue = Number(stringValue);
    }
    if (
      numberValue != null &&
      numberValue != undefined &&
      appliedReferenceRange
    ) {
      if (numberValue < appliedReferenceRange.lowValue) return true;
      else if (numberValue > appliedReferenceRange.highValue) return true;
    }

    return false;
  }
);

Handlebars.registerHelper(
  "value",
  function (numberValue: number | null, stringValue: string | null) {
    if (stringValue != null && stringValue != undefined) return stringValue;
    else if (numberValue != null && numberValue != undefined) {
      // Check if the number is a whole number
      const isWholeNumber = numberValue % 1 === 0;
      
      let formatted;
      if (isWholeNumber) {
        // For whole numbers, don't show decimal places
        formatted = numberValue.toString();
      } else {
        // For decimal numbers, use toFixed(2)
        formatted = numberValue.toFixed(2);
      }
      
      const parts = formatted.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1];
      
      // Format integer part with Indian numbering system
      let formattedInteger = '';
      const len = integerPart.length;
      
      if (len <= 3) {
        formattedInteger = integerPart;
      } else {
        // First 3 digits from right
        formattedInteger = integerPart.slice(-3);
        let remaining = integerPart.slice(0, -3);
        
        // Then every 2 digits
        while (remaining.length > 0) {
          if (remaining.length >= 2) {
            formattedInteger = remaining.slice(-2) + ',' + formattedInteger;
            remaining = remaining.slice(0, -2);
          } else {
            formattedInteger = remaining + ',' + formattedInteger;
            remaining = '';
          }
        }
      }
      
      // Add decimal part only if it exists
      if (decimalPart) {
        return formattedInteger + '.' + decimalPart;
      } else {
        return formattedInteger;
      }
    }
    else return "";
  }
);

Handlebars.registerHelper(
  "valueWithDecimal",
  function (numberValue: number | null, stringValue: string | null, decimal: number | null) {
    // For non-numeric values, return string value as-is
    if (stringValue != null && stringValue != undefined) return stringValue;
    
    // For numeric values, apply decimal precision if specified
    if (numberValue != null && numberValue != undefined) {
      let formatted;
      
      // If decimal precision is specified and it's a numeric test
      if (decimal != null && decimal >= 0 && decimal <= 10) {
        formatted = numberValue.toFixed(decimal);
      } else {
        // Fallback to original logic
        const isWholeNumber = numberValue % 1 === 0;
        if (isWholeNumber) {
          formatted = numberValue.toString();
        } else {
          formatted = numberValue.toFixed(2);
        }
      }
      
      const parts = formatted.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1];
      
      // Format integer part with Indian numbering system
      let formattedInteger = '';
      const len = integerPart.length;
      
      if (len <= 3) {
        formattedInteger = integerPart;
      } else {
        // First 3 digits from right
        formattedInteger = integerPart.slice(-3);
        let remaining = integerPart.slice(0, -3);
        
        // Then every 2 digits
        while (remaining.length > 0) {
          if (remaining.length >= 2) {
            formattedInteger = remaining.slice(-2) + ',' + formattedInteger;
            remaining = remaining.slice(0, -2);
          } else {
            formattedInteger = remaining + ',' + formattedInteger;
            remaining = '';
          }
        }
      }
      
      // Add decimal part based on decimal precision
      if (decimal != null && decimal > 0) {
        // Show decimal part when decimal precision is greater than 0
        return formattedInteger + '.' + decimalPart;
      } else if (decimal === 0) {
        // When decimal is 0, return only integer part (no decimal point)
        return formattedInteger;
      } else if (decimalPart && decimalPart !== '0'.repeat(decimalPart.length)) {
        // Only show decimal part if it's not all zeros (original behavior when decimal is null)
        return formattedInteger + '.' + decimalPart;
      } else {
        return formattedInteger;
      }
    }
    
    return "";
  }
);

Handlebars.registerHelper(
  "isPossibleStringValue",
  function (stringValue: string | null, _appliedReferenceRange: any, possibleStringValues: string[]) {
    if (!stringValue) return false;

    // Strip * from the entered value too (in case frontend sends "*5 - 8")
    const normalizedInput = stringValue.replace(/^\*/, "").trim().toLowerCase();

    if (Array.isArray(possibleStringValues) && possibleStringValues.length > 0) {
      const matched = possibleStringValues.find(
        (pv: string) => pv.replace(/^\*/, "").trim().toLowerCase() === normalizedInput
      );
      if (!matched) return false;
      return matched.trimStart().startsWith("*");
    }

    return false;
  }
);

Handlebars.registerHelper("startsWithAsterisk", function (name: string) {
  if (typeof name !== "string") return false;
  return name.trimStart().startsWith("*");
});

Handlebars.registerHelper("removeAsterisk", function (name: string) {
  if (typeof name !== "string") return name;
  // Remove asterisk after any leading spaces, but keep the spaces
  return name.replace(/^(\s*)\*/, "$1");
});

Handlebars.registerHelper("or", function (...args) {
  // Remove the last argument which is the Handlebars options object
  const values = args.slice(0, -1);
  return values.some(val => {
    if (Array.isArray(val)) return val.length > 0;
    return val != null && val !== false && val !== "";
  });
});

Handlebars.registerHelper("isHeaderWithNoValue", function (name: string, numberValue: any, stringValue: any) {
  const endsWithDash = typeof name === "string" && name.trim().endsWith("-");
  const hasNoValue = !numberValue && !stringValue && stringValue !== "" && numberValue !== 0;
  return endsWithDash && hasNoValue;
});

Handlebars.registerHelper("formatReferenceRange", function (appliedReferenceRange: any, comment: string) {
  if (!appliedReferenceRange) {
    return comment || "";
  }

  const EXTREME_LOW = -99999999;
  const EXTREME_HIGH = 99999999;

  const lowValue = appliedReferenceRange.lowValue;
  const highValue = appliedReferenceRange.highValue;
  const stringValue = appliedReferenceRange.stringValue;

  // If stringValue exists, use it
  if (stringValue) {
    return stringValue;
  }

  // If both lowValue and highValue exist
  if (lowValue != null && highValue != null) {
    const isLowExtreme = lowValue === EXTREME_LOW;
    const isHighExtreme = highValue === EXTREME_HIGH;

    if (isLowExtreme && isHighExtreme) {
      // Both are extreme, show comment or nothing
      return comment || "";
    } else if (isLowExtreme) {
      // Only low is extreme, show "< highValue"
      return `< ${highValue}`;
    } else if (isHighExtreme) {
      // Only high is extreme, show "> lowValue"
      return `> ${lowValue}`;
    } else {
      // Normal range
      return `${lowValue} - ${highValue}`;
    }
  }

  // If only lowValue exists
  if (lowValue != null) {
    if (lowValue === EXTREME_LOW) {
      return comment || "";
    }
    return `> ${lowValue}`;
  }

  // If only highValue exists
  if (highValue != null) {
    if (highValue === EXTREME_HIGH) {
      return comment || "";
    }
    return `< ${highValue}`;
  }

  // Fallback to comment
  return comment || "";
});

Handlebars.registerHelper("ageDisplay", function (age: number, months: number, days: number) {
  const y = Number(age) || 0;
  const m = Number(months) || 0;
  const d = Number(days) || 0;

  if (y > 0) {
    return m > 0 ? `${y} Yrs ${m} Months` : `${y} Yrs`;
  } else if (m > 0) {
    return d > 0 ? `${m} Months ${d} Days` : `${m} Months`;
  } else {
    return d > 0 ? `${d} Days` : `0 Yrs`;
  }
});

Handlebars.registerHelper("capitalize", function (str: string) {
  if (!str || typeof str !== "string") return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
});

Handlebars.registerHelper("endsWithAsterisk", function (testName: string) {
  if (!testName || typeof testName !== "string") return false;
  return testName.trim().endsWith("*");
});

Handlebars.registerHelper("removeEndAsterisk", function (name: string) {
  if (typeof name !== "string") return name;
  // Remove asterisk from the end, preserving spaces
  return name.replace(/\*\s*$/, "");
});

class TemplateEngine {
  static render(templateName: string, data: any): string {
    const filePath = path.join(__dirname, "..", "templates", templateName);
    const templateSource = fs.readFileSync(filePath, "utf8");
    const template = Handlebars.compile(templateSource);
    return template(data);
  }
}

Handlebars.registerHelper("startsWith", function (str: string, prefix: string) {
  if (typeof str !== "string") return false;
  return str.startsWith(prefix);
});

export default TemplateEngine;
