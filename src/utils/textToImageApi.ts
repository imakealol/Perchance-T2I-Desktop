import type { GeneratorConfig } from '../stores/generatorStore';
import { artStyles } from '../constants/artStyles';

const PROXY_URL = "https://t2i.manh9011.workers.dev/";

export const generateImage = async (config: GeneratorConfig) => {
    const style = artStyles[config.artStyle] || artStyles["No Style"];
    const prompt = style.prompt(config);
    const negative = style.negative(config);

    const params = new URLSearchParams();
    params.append("guidance_scale", config.guidanceScale.toString());
    params.append("negative_prompt", negative);
    params.append("prompt", prompt);
    params.append("quality", "high");
    params.append("width", config.width.toString());
    params.append("height", config.height.toString());
    params.append("seed", config.seed === -1 ? "-1" : config.seed.toString());
    params.append("model", "zimage");

    const url = `${PROXY_URL}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Proxy responded with ${response.status}: ${response.statusText}`);
    }
    const blob = await response.blob();
    return blob;
};
