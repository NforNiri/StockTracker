declare module 'react-select-country-list' {
  export interface CountryData {
    value: string;
    label: string;
  }

  export interface CountryList {
    getData: () => CountryData[];
    getLabel: (value: string) => string;
    setLabel: (value: string, label: string) => CountryList;
    setEmpty: (label: string) => CountryList;
    native: () => CountryList;
  }

  function countryList(): CountryList;
  export default countryList;
}

