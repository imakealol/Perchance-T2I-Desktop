import { defineStore } from 'pinia';

export interface CustomStyle {
    id: string;
    name: string;
    promptTemplate: string;
    negativeTemplate: string;
    isBuiltIn: false;
}

interface StylesState {
    customStyles: CustomStyle[];
}

export const useStylesStore = defineStore('styles', {
    state: (): StylesState => ({
        customStyles: []
    }),

    getters: {
        getStyleById: (state) => (id: string) => {
            return state.customStyles.find(s => s.id === id);
        },

        getStyleByName: (state) => (name: string) => {
            return state.customStyles.find(s => s.name === name);
        },
    },

    actions: {
        addCustomStyle(style: Omit<CustomStyle, 'id' | 'isBuiltIn'>) {
            const newStyle: CustomStyle = {
                id: crypto.randomUUID(),
                name: style.name,
                promptTemplate: style.promptTemplate,
                negativeTemplate: style.negativeTemplate,
                isBuiltIn: false
            };
            this.customStyles.push(newStyle);
            return newStyle;
        },

        updateCustomStyle(id: string, updates: Partial<Omit<CustomStyle, 'id' | 'isBuiltIn'>>) {
            const index = this.customStyles.findIndex(s => s.id === id);
            if (index !== -1) {
                this.customStyles[index] = { ...this.customStyles[index], ...updates };
            }
        },

        deleteCustomStyle(id: string) {
            const index = this.customStyles.findIndex(s => s.id === id);
            if (index !== -1) {
                this.customStyles.splice(index, 1);
            }
        },

        duplicateStyle(name: string, promptTemplate: string, negativeTemplate: string) {
            // Use this to create a copy of a built-in style for editing
            return this.addCustomStyle({
                name: `${name} (Copy)`,
                promptTemplate,
                negativeTemplate
            });
        }
    }
});
