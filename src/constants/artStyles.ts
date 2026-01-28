import type { GeneratorConfig } from '../stores/generatorStore';
import type { CustomStyle } from '../stores/stylesStore';

export interface ArtStyle {
    name: string;
    prompt: (config: GeneratorConfig) => string;
    negative: (config: GeneratorConfig) => string;
    isBuiltIn?: boolean; // defaults to true for built-in styles
}

const choose = (...options: string[]): string => {
    return options.length > 0 ? options[Math.floor(Math.random() * options.length)] : "";
};

// Helper to convert custom style template to function
export const createStyleFromTemplate = (promptTemplate: string, negativeTemplate: string) => ({
    prompt: (config: GeneratorConfig) => promptTemplate.replace(/\{prompt\}/gi, config.prompt).replace(/\{negative\}/gi, config.negative),
    negative: (config: GeneratorConfig) => negativeTemplate.replace(/\{prompt\}/gi, config.prompt).replace(/\{negative\}/gi, config.negative),
});

// Convert a CustomStyle to an ArtStyle
export const customStyleToArtStyle = (custom: CustomStyle): ArtStyle => ({
    name: custom.name,
    ...createStyleFromTemplate(custom.promptTemplate, custom.negativeTemplate),
    isBuiltIn: false
});

export const artStyles: Record<string, ArtStyle> = {
    "No Style": {
        name: "No Style",
        prompt: (config) => config.prompt,
        negative: (config) => config.negative
    },

    "Painted Anime": {
        name: "Painted Anime",
        prompt: (config) => {
            let desc = config.prompt.replace(/\b(male|man)\b/gi, "(male, masculine, masc, male)");
            return `${desc}, art by atey ghailan, painterly anime style at pixiv, art by kantoku, in art style of redjuice/necömi/rella/tiv pixiv collab, your name anime art style, masterpiece digital painting, exquisite lighting and composition, inspired by wlop art style, 8k, sharp, very detailed, high resolution, illustration ^2 painterly anime artwork, ${config.prompt}, masterpiece, fine details, breathtaking artwork, painterly art style, high quality, 8k, very detailed, high resolution, exquisite composition and lighting`;
        },
        negative: (config) => {
            const isMale = /(male|man)/i.test(config.prompt);
            return `(worst quality, low quality, blurry:1.3), ${config.negative}, low-quality, deformed, text, poorly drawn${isMale ? ", female, feminine, fem, female" : ""}, (worst quality, low quality, blurry:1.3), black and white, low-quality, deformed, text, poorly drawn, bad art, bad anatomy, bad lighting, disfigured, faded, blurred face`;
        }
    },

    "Casual Photo": {
        name: "Casual Photo",
        prompt: (config) => `${config.prompt}, casual photo`,
        negative: (config) => `${config.negative}, bad photo, bad lighting, high production value, unnatural studio lighting, commercial photoshoot, photoshopped, terrible photo, disfigured`
    },

    "Cinematic": {
        name: "Cinematic",
        prompt: (config) => `${config.prompt}, cinematic shot, dynamic lighting, 75mm, Technicolor, Panavision, cinemascope, sharp focus, fine details, 8k, HDR, realism, realistic, key visual, film still, cinematic color grading, depth of field`,
        negative: (config) => `${config.negative}, bad lighting, low-quality, deformed, text, poorly drawn, holding camera, bad art, bad angle, boring, low-resolution, worst quality, bad composition, disfigured`
    },

    "Digital Painting": {
        name: "Digital Painting",
        prompt: (config) => `${config.prompt}, breathtaking digital art, trending on artstation, by atey ghailan, by greg rutkowski, by greg tocchini, by james gilleard, 8k, high resolution, best quality`,
        negative: (config) => `${config.negative}, low-quality, deformed, signature watermark text, poorly drawn`
    },

    "Concept Art": {
        name: "Concept Art",
        prompt: (config) => `${config.prompt}, concept art, digital art, illustration, inspired by wlop style, 8k, fine details, sharp, very detailed, high resolution, masterpiece`,
        negative: (config) => `${config.negative}, low-quality, deformed, text, poorly drawn, worst quality, blurry`
    },

    "3D Disney Character": {
        name: "3D Disney Character",
        prompt: (config) => `3D cartoon Disney character portrait render. ${config.prompt}, bokeh, 4k, highly detailed, Pixar render, CGI Animation, Disney, cute big circular reflective eyes, dof, (cinematic film), Disney realism, subtle details, breathtaking Pixar short, fine details, close up, sharp focus, HDR, Disney-style octane render, incredible composition, superb lighting and detail, ${config.prompt}`,
        negative: (config) => `${config.negative}, worst quality, poorly drawn, bad art, boring, deformed, bad composition, crappy artwork, bad lighting`
    },

    "2D Disney Character": {
        name: "2D Disney Character",
        prompt: (config) => `2D cartoon Disney character digital art of ${config.prompt}. superb linework, classic 2D Disney style art, close-up, inspired by the art styles of Glen Keane and Aaron Blaise, Disney-style character concept with a Disney-style face, (trending on artstation), Disney-style version of ${config.prompt}`,
        negative: (config) => `${config.negative}, bad 3D render, bad 3D shadowing, worst quality, poorly drawn, low-resolution render, bad colors, a photo, terrible art, text, logo, bad composition, bad lighting, disfigured, deformed, bad anatomy, crappy educational infographic cartoon, bad 3D render, black and white photo`
    },

    "Disney Sketch": {
        name: "Disney Sketch",
        prompt: (config) => `Glen Keane character concept art (black and white) pencil sketch of ${config.prompt}. (rough pencil sketch by Glen Keane:1.2), rough pencil sketch, close up, loose Disney-style character concept art sketch, (nice sketchy pencil strokes), Disney character design sketch, pencil texture, a concept art pencil sketch of ${config.prompt}, (by Glen Keane:1.3)`,
        negative: (config) => `${config.negative}, a photo, photorealistic style, with color, (a bad photo), bad digital art, bad 3D render, gradient, overly detailed, high contrast, bloom, a color photo, smooth shading, hilariously bad drawings, bad anatomy, bad art, 3D, a photo, soft shadows, lot of color`
    },

    "Concept Sketch": {
        name: "Concept Sketch",
        prompt: (config) => `black and white technical drawing showcasing a ${config.prompt}, annotation details, masterpiece black and white, pencil strokes, annotated technical concept art sketch, pencil texture`,
        negative: (config) => config.negative
    },

    "Painterly": {
        name: "Painterly",
        prompt: (config) => `painterly digital painting, ${config.prompt}, digital painting by Ilya Kuvshinov with painterly brush strokes, by Ilya Kuvshinov, painterly masterpiece`,
        negative: (config) => `brush, ${config.negative}, bad 3D render, (holding paintbrush), easel, bad photo, bad art, boring, bad 3D render`
    },

    "Oil Painting": {
        name: "Oil Painting",
        prompt: (config) => `breathtaking alla prima oil painting, ${config.prompt}, close up, (alla prima style:1.3), oil on linen, painterly oil on canvas, (painterly style:1.3), exquisite composition and lighting, modern painterly masterpiece, by alexi zaitsev, award-winning painterly alla prima oil painting`,
        negative: (config) => `${config.negative}, framed, faded colors, terrible photo, bad composition, hilariously bad drawing, bad photo, bad anatomy, extremely high contrast, worst quality, watermarked signature, bad colors, deformed, amputee, washed out, glare, boring colors, bad crayon drawing`
    },

    "Oil Painting - Realism": {
        name: "Oil Painting - Realism",
        prompt: (config) => `breathtaking oil painting, ${config.prompt}, photorealistic oil painting, by charlie bowater, fine details, by wlop, trending on artstation, very detailed`,
        negative: (config) => `${config.negative}, low-quality, deformed, text, poorly drawn, worst quality`
    },

    "Oil Painting - Old": {
        name: "Oil Painting - Old",
        prompt: (config) => `(${config.prompt}) (Oil painting) (by Jean-François Millet), (by Gustave Courbet), (by Jules Breton), close up`,
        negative: (config) => `${config.negative}, frame, (badly drawn hands), extra limbs, extra fingers, bad anatomy`
    },

    "Professional Photo": {
        name: "Professional Photo",
        prompt: (config) => `${config.prompt}, ${choose("sharp", "soft")} focus, depth of field, 8k photo, HDR, professional lighting, taken with Canon EOS R5, 75mm lens`,
        negative: (config) => `${config.negative}, worst quality, bad lighting, cropped, blurry, low-quality, deformed, text, poorly drawn, bad art, bad angle, boring, low-resolution, worst quality, bad composition, terrible lighting, bad anatomy`
    },

    "Anime": {
        name: "Anime",
        prompt: (config) => `(anime art of ${config.prompt}:1.2), masterpiece, 4k, best quality, anime art`,
        negative: (config) => `(worst quality, low quality:1.3), ${config.negative}, low-quality, deformed, text, poorly drawn, hilariously bad drawing, bad 3D render`
    },

    "Drawn Anime": {
        name: "Drawn Anime",
        prompt: (config) => `digital art drawing, illustration of (${config.prompt}), anime drawing/art, bold linework, illustration, cel shaded, painterly style, digital art, masterpiece`,
        negative: (config) => `${config.negative}, boring flat infographic, oversaturated, bad photo, terrible 3D render, bad anatomy, worst quality, greyscale, black and white, disfigured, deformed, glitch, cross-eyed, lazy eye, ugly, deformed, distorted, glitched, lifeless, low quality, bad proportions`
    },

    "Cute Anime": {
        name: "Cute Anime",
        prompt: (config) => `(((adorable, cute, kawaii)), ${config.prompt}, cute moe anime character portrait, adorable, featured on pixiv, kawaii moé masterpiece, cuteness overload, very detailed, sooooo adorable!!!, absolute masterpiece`,
        negative: (config) => `(worst quality, low quality:1.3), ${config.negative}, worst quality, ugly, 3D, photograph, bad art, blurry, boring`
    },

    "Soft Anime": {
        name: "Soft Anime",
        prompt: (config) => `${config.prompt}, anime masterpiece, soft lighting, intricate, highly detailed, pixiv, anime art, 4k, art from your name anime, garden of words style art, high quality`,
        negative: (config) => `(worst quality, low quality:1.3), ${config.negative}, low-quality, deformed, text, poorly drawn`
    },

    "Fantasy Painting": {
        name: "Fantasy Painting",
        prompt: (config) => `${config.prompt}, d&d, fantasy, highly detailed, digital painting, artstation, sharp focus, fantasy art, illustration, 8k, in the style of greg rutkowski`,
        negative: (config) => `${config.negative}, low-quality, deformed, text, poorly drawn`
    },

    "Fantasy Landscape": {
        name: "Fantasy Landscape",
        prompt: (config) => `${config.prompt}, fantasy matte painting, absolute masterpiece, detailed matte painting by andreas rocha and greg rutkowski, by Brothers Hildebrandt, superb composition, vivid fantasy art, breathtaking fantasy masterpiece`,
        negative: (config) => `${config.negative}, faded, blurry, bad art, boring`
    },

    "Fantasy Portrait": {
        name: "Fantasy Portrait",
        prompt: (config) => `${config.prompt}, d&d, fantasy, highly detailed, digital painting, artstation, sharp focus, fantasy art, character art, illustration, 8k, art by artgerm and greg rutkowski`,
        negative: (config) => `${config.negative}, low-quality, deformed, text, poorly drawn`
    },

    "Studio Ghibli": {
        name: "Studio Ghibli",
        prompt: (config) => `${config.prompt}, (studio ghibli style art:1.3), sharp, very detailed, high resolution, inspired by hayao miyazaki, anime, art from ghibli movie`,
        negative: (config) => `(worst quality, low quality:1.3), ${config.negative}, low-quality, deformed, text, poorly drawn`
    },

    "50s Enamel Sign": {
        name: "50s Enamel Sign",
        prompt: (config) => `50s enamel sign of ${config.prompt}, 50s advert enamel sign, masterpiece, authentic vintage enamel sign`,
        negative: (config) => `${config.negative}`
    },

    "Vintage Comic": {
        name: "Vintage Comic",
        prompt: (config) => `comic book style art of ${config.prompt}, (drawing, by Dave Stevens, by Adam Hughes, 1940's, 1950's:1.2), hand-drawn, color, high resolution, best quality, closeup`,
        negative: (config) => `${config.negative}, terrible photoshop, low contrast, disfigured, poorly drawn, deformed, tiled, cropped, framed`
    },

    "Franco-Belgian Comic": {
        name: "Franco-Belgian Comic",
        prompt: (config) => `franco-belgian color comic about ${config.prompt}, bande dessinée, franco-belgian comic panel, masterpiece, breathtaking composition, intricate, detailed, best quality, close-up`,
        negative: (config) => `${config.negative}, framed blurry crappy photo, overexposed, worst quality, border, deformed horror, overly faded`
    },

    "Tintin Comic": {
        name: "Tintin Comic",
        prompt: (config) => `color comic panel in the style of Hergé about ${config.prompt}, by Hergé, tintin style, french comic panel, franco-belgian style, close-up, masterpiece, high-resolution Hergé style`,
        negative: (config) => `${config.negative}, blurry, framed edge border, text, overexposed, bad anatomy, deformed, disfigured, blur, horror, dead eyes, boring, faded, (worst quality, low quality:1.2)`
    },

    "Medieval": {
        name: "Medieval",
        prompt: (config) => `medieval illuminated manuscript picture of ${config.prompt}, medieval illuminated manuscript art, masterpiece medieval color illustration, 16th century, 8k high-resolution scan of 16th century illuminated manuscript painting, detailed medieval masterpiece, close-up`,
        negative: (config) => `${config.negative}, worst quality, blurry`
    },

    "Pixel Art": {
        name: "Pixel Art",
        prompt: (config) => `${config.prompt.length > 40 ? "(pixel art), " : ""}${config.prompt}, best pixel art, neo-geo graphical style, retro nostalgic masterpiece, 128px, 16-bit pixel art, 2D pixel art style, adventure game pixel art, inspired by the art style of hyper light drifter, masterful dithering, superb composition, beautiful palette, exquisite pixel detail`,
        negative: (config) => `${config.negative}, glitched, deep fried, jpeg artifacts, out of focus, gradient, soft focus, low quality, poorly drawn, blur, grainy fabric texture, text, bad art, boring colors, blurry platformer screenshot`
    },

    "Furry - Oil": {
        name: "Furry - Oil",
        prompt: (config) => `(${config.prompt}:1.3), crisp vibrant detailed soft painterly digital art, volumetric lighting, natural lighting, realistic lighting, vibrant colors, crisp oil painting, painterly realism, depth of field, subtle soft details, vivid, fresh, striking, by chunie, by darkgem, by honovy, by zaush, by anhes, by puinkey, by caraid, by dagasi, by taranfiddler, by atey ghailan, by MilletGustave, by Curbet, Charlie Bowater, lol art`,
        negative: (config) => `${config.negative}, blurry, faded, antique, muted colors, greyscale, boring colors, flat, bad photo, terrible 3D render, bad anatomy, worst quality, greyscale, black and white, disfigured, deformed, glitch, cross-eyed, lazy eye, ugly, deformed, distorted, glitched, lifeless, low quality, bad proportions, watermark, signature`
    },

    "Furry - Cinematic": {
        name: "Furry - Cinematic",
        prompt: (config) => `${config.prompt}, cinematic shot, dynamic lighting, 75mm, Technicolor, Panavision, cinemascope, sharp focus, fine details, 8k, HDR, realism, realistic, key visual, film still, cinematic color grading, depth of field, (anthro:0.1)`,
        negative: (config) => `${config.negative}, bad lighting, low-quality, deformed, text, poorly drawn, holding camera, bad art, bad angle, boring, low-resolution, worst quality, bad composition, disfigured`
    },

    "Furry - Painted": {
        name: "Furry - Painted",
        prompt: (config) => `anthro ${config.prompt} digital art, masterpiece, 4k, fine details`,
        negative: (config) => `${config.negative}, bad photo, worst quality, bad composition, bad lighting, bad colors, small eyes, low quality, bad art, poorly drawn, deformed, bad 3D render, boring, lifeless, deformed, ugly, low resolution`
    },

    "Furry - Drawn": {
        name: "Furry - Drawn",
        prompt: (config) => `anthro ${config.prompt} illustration, hand-drawn, bold linework, anthro illustration, cel shaded, 4k, fine details, masterpiece`,
        negative: (config) => `${config.negative}, bad photo, terrible 3D render, bad anatomy, worst quality, greyscale, black and white, disfigured, deformed, glitch, cross-eyed, lazy eye, ugly, deformed, distorted, glitched, lifeless, low quality, bad proportions`
    },

    "Cute Figurine": {
        name: "Cute Figurine",
        prompt: (config) => `${config.prompt}, figurine, modern Disney style, octane render, chibi`,
        negative: (config) => `${config.negative}, low-quality, deformed, text, poorly drawn`
    },

    "3D Emoji": {
        name: "3D Emoji",
        prompt: (config) => `masterpiece ((${config.prompt})) cartoon emoji concept render, (close-up:1.3), facing forward, (matte), emoji render trending on artstation, noto color emoji, app icon, joypixels, simple design, new iOS 16.4 (((${config.prompt}))) emoji render, (simple background:1.2), (centered:1.2), masterpiece, telegram sticker, clash of clans character concept, (looking at camera), crisp render, sharp focus, simple cartoon design, 4k, sharp focus, an emoji with cartoon proportions, masterpiece emoji-style figurine render, transparent background png`,
        negative: (config) => `${config.negative}, framed, inset, border, glare, blurry, out of focus, shiny, (on pedestal:1.2), on platform, with base, gradient background, off-center, casting shadow, ((deformed, disfigured)), glitchy, vector art, text, signature, bad anatomy, messed up, bad art, gradient background, complex background, blurry, worst quality, low resolution, messy, complex, gradient background, bad lighting`
    },

    "Illustration": {
        name: "Illustration",
        prompt: (config) => `breathtaking illustration of ${config.prompt}, (illustration:1.3), masterpiece, breathtaking illustration`,
        negative: (config) => `${config.negative}, low-quality, deformed, text, poorly drawn, bad 3D render, bad composition, bad photo, worst quality`
    },

    "Flat Illustration": {
        name: "Flat Illustration",
        prompt: (config) => `${config.prompt}, illustration, flat, 2D, vector art, masterpiece, made with adobe illustrator, behance competition winner, trending on dribble, 4k, high resolution, crisp lines`,
        negative: (config) => `${config.negative}, bad art, children's crayon drawing, worst quality, blurry, blur, jpeg artifacts, compression artifacts, text, worst quality, noise, messy, low resolution`
    },

    "Watercolor": {
        name: "Watercolor",
        prompt: (config) => `${config.prompt}, (watercolor), high resolution, intricate details, 4k, wallpaper, concept art, watercolor on textured paper`,
        negative: (config) => `${config.negative}, low-quality, deformed, text, poorly drawn`
    },

    "1990s Photo": {
        name: "1990s Photo",
        prompt: (config) => `${config.prompt}, 90s home video, nostalgic 90s photo, taken with kodak disposable camera`,
        negative: (config) => `${config.negative}, blurry, blur, deformed`
    },

    "1980s Photo": {
        name: "1980s Photo",
        prompt: (config) => `famous vintage 80s photo, ${config.prompt}, grainy photograph, 80s photo with film grain, Kodacolor II 80s photo with vignetting, retro, r/OldSchoolCool, 80s photo with wear and tear and minor creasing and scratches, vintage color photo`,
        negative: (config) => `${config.negative}, deformed`
    },

    "1970s Photo": {
        name: "1970s Photo",
        prompt: (config) => `famous vintage 70s photo, ${config.prompt}, grainy photograph, 1970s photo with film grain, 70s photo with vignetting, retro, r/OldSchoolCool, 70s photo, vintage photo`,
        negative: (config) => `${config.negative}, deformed`
    },

    "1960s Photo": {
        name: "1960s Photo",
        prompt: (config) => `famous vintage 60s photo, ${config.prompt}, grainy photograph, 1960s photo with film grain, 60s photo with vignetting, retro, r/OldSchoolCool, 60s photo, vintage photo`,
        negative: (config) => `${config.negative}, deformed`
    },

    "1950s Photo": {
        name: "1950s Photo",
        prompt: (config) => `famous vintage 50s photo, ${config.prompt}, grainy photograph, 1950s photo with film grain, 1950s photo with vignetting, retro, r/OldSchoolCool, 1950s photo, vintage photo`,
        negative: (config) => `${config.negative}, deformed`
    },

    "1940s Photo": {
        name: "1940s Photo",
        prompt: (config) => `famous vintage 1940s photo, ${config.prompt}, grainy photograph, 1940s photo with film grain, 1940s photo with vignetting, retro, r/OldSchoolCool, 1940s photo, vintage photo`,
        negative: (config) => `${config.negative}, deformed`
    },

    "1930s Photo": {
        name: "1930s Photo",
        prompt: (config) => `famous vintage 1930s photo, ${config.prompt}, grainy photograph, 1930s photo with film grain, 1930s photo with vignetting, retro, r/OldSchoolCool, 1930s photo, vintage photo`,
        negative: (config) => `${config.negative}, deformed`
    },

    "1920s Photo": {
        name: "1920s Photo",
        prompt: (config) => `famous vintage 1920s photo, ${config.prompt}, 1920s photo, restored photograph, ${choose("sepia", "black and white")}, historical archive photo`,
        negative: (config) => `${config.negative}, deformed`
    },

    "Vintage Pulp Art": {
        name: "Vintage Pulp Art",
        prompt: (config) => `(((1970s vintage pulp art))), ${config.prompt}, vintage pulp art, by Earle K. Bergey, by Kelly Freas, by Alex Schomburg, by H. J. Ward, glossy pulp art, Amazing Stories, Weird Tales, 8k, high resolution, best quality`,
        negative: (config) => `${config.negative}, text, cropped, bad art, deformed, worst quality, watermark, text`
    },

    "50s Infomercial Anime": {
        name: "50s Infomercial Anime",
        prompt: (config) => `${config.prompt}, 1950s infomercial style, (delicate linework:1.1), paprika anime art style, close-up, (chromatic aberration glow:1.2), 2d painted cel animation, close-up, soft focus, 2D pixiv 1950s`,
        negative: (config) => `worst quality, low quality, ${config.negative}, neon tube, bad art, messy, disfigured, bad anatomy, out of focus, grainy, blurry, jpeg artifact noise, deformed`
    },

    "3D Pokemon": {
        name: "3D Pokemon",
        prompt: (config) => `a pokemon creature, ((${config.prompt})), 4k render, beautiful pokemon digital art, fakemon, pokemon creature, cryptid, fakemon, masterpiece, ${choose("soft", "sharp")}, (best quality, high quality:1.3)`,
        negative: (config) => `${config.negative}, distorted, deformed, bad art, low quality, over saturated, extreme contrast, (worst quality, low quality:1.3)`
    },

    "Painted Pokemon": {
        name: "Painted Pokemon",
        prompt: (config) => `(${config.prompt}), 4k digital painting of a pokemon, amazing pokemon creature art by piperdraws, cryptid creations by Piper Thibodeau, by Naoki Saito and ${choose("Tokiya", "Mitsuhiro Arita")}, incredible composition`,
        negative: (config) => `${config.negative}, crappy 3D render, distorted, deformed, bad art, low quality, text, signature`
    },

    "2D Pokemon": {
        name: "2D Pokemon",
        prompt: (config) => `(${config.prompt}:1.2), pokemon creature concept, superb line art, beautiful colors and composition, 2d art style, beautiful pokemon digital art, fakemon, by Sowsow, pokemon creature, cryptid, fakemon, masterpiece, by Yuu Nishida, 4k`,
        negative: (config) => `${config.negative}, multiple, grid, (black and white), distorted, deformed, bad art, low quality, crappy 3D render, text watermark symbols logo`
    },

    "Vintage Anime": {
        name: "Vintage Anime",
        prompt: (config) => `${config.prompt}, 1990s anime, vintage anime, 90's anime style, by hajime sorayama, by greg tocchini, anime masterpiece, pixiv, akira-style art, akira anime art, 4k, high quality`,
        negative: (config) => `${config.negative}, (worst quality, low quality:1.3), bad art, distorted, deformed`
    },

    "Neon Vintage Anime": {
        name: "Neon Vintage Anime",
        prompt: (config) => `${config.prompt}, ((neon vintage anime)) style, 90's anime style, 1990s anime, hajime sorayama, greg tocchini, neon vintage anime masterpiece, anime art, 4k, high quality`,
        negative: (config) => `${config.negative}, blurry, (worst quality, low quality:1.3), bad art, distorted, deformed`
    },

    "Manga": {
        name: "Manga",
        prompt: (config) => `${config.prompt}, incredible hand-drawn manga, black and white, by Takehiko Inoue, by Katsuhiro Otomo and akira toriyama manga, hand-drawn art by rumiko takahashi and Inio Asano, Ken Akamatsu manga art`,
        negative: (config) => `${config.negative}, (worst quality, low quality:1.3), bad photo, bad 3D render, distorted, deformed, fuzzy, noisy, blurry, smudge`
    },

    "Fantasy World Map": {
        name: "Fantasy World Map",
        prompt: (config) => `beautiful fantasy map of ${config.prompt}, beautiful fantasy map inspired by middle earth and azeroth and discworld and westeros and essos and the witcher world and tamriel and faerûn and thedas, 4k, beautiful colors, crisp, high-resolution artistic map, topographic 3D terrain, artistic map`,
        negative: (config) => `${config.negative}, low quality, blurry, worst quality, childrens drawing, boring, logo, scratchy and grainy, messy, washed out colors, sepia, hazy`
    },

    "Fantasy City Map": {
        name: "Fantasy City Map",
        prompt: (config) => `an aerial view of a city, TTRPG city map showing the full city, ${config.prompt}, fantasy art, by senior environment artist, beautiful fantasy map`,
        negative: (config) => `${config.negative}, fuzzy, bad art`
    },

    "Old World Map": {
        name: "Old World Map",
        prompt: (config) => `fantasy world map of ${config.prompt}, fantasy world map, highly detailed digital painting, fantasy art, map illustration, 8k`,
        negative: (config) => `${config.negative}, low resolution, worst quality`
    },

    "3D Isometric Icon": {
        name: "3D Isometric Icon",
        prompt: (config) => `${config.prompt}, 3D isometric render of cute ${config.prompt}, 3D app icon, clean isometric design, beautiful design, soft gradient background, soft colors, centered, 3D blender render, masterpiece, best quality, high resolution, 8k octane render, beautiful color scheme, soft smooth lighting, physically based rendering, square image, high polycount`,
        negative: (config) => `${config.negative}, low quality, terrible design, glitchy compression artefacts, deformed, blurry compression artefacts, text`
    },

    "Flat Style Icon": {
        name: "Flat Style Icon",
        prompt: (config) => `${config.prompt}, creative icon, flat style icon, masterpiece, high resolution, crisp, beautiful composition and color choice, beautiful flat painted style, behance contest-winner, award winning icon illustration, 8k, best quality`,
        negative: (config) => `${config.negative}, gradient, bad design, blurry, jpeg compression artefacts, grainy, gradient, text, messy and inconsistent`
    },

    "Flat Style Logo": {
        name: "Flat Style Logo",
        prompt: (config) => `beautiful flat-style logo design depicting ${config.prompt}, creative flat-style logo design, trending on dribbble, featured on behance, portfolio piece, minimal flat design, breathtaking graphic design, 8k, high resolution vector logo, plain background, amazingly beautiful logo design, winner of best logo award`,
        negative: (config) => `${config.negative}, photo, hilariously bad design, bad composition, bad colors, blurry, worst quality, low quality, shadow, boring, bad dsign, worst design ever, hilariously bad design, drop-shadow, gradient, messy, chaotic`
    },

    "Game Art Icon": {
        name: "Game Art Icon",
        prompt: (config) => `${config.prompt}, a concept art icon for league of legends, a digital art logo, illustration, league of legends style icon, inspired by wlop style, 8k, dota 2 style icon, fine details, sharp, very detailed icon, high resolution rpg ability/spell/item icon`,
        negative: (config) => `${config.negative}, low-quality, deformed, text, poorly drawn, multiple`
    },

    "Digital Painting Icon": {
        name: "Digital Painting Icon",
        prompt: (config) => `${config.prompt}, app logo icon, digital art pictogram icon, trending on artstation, app icon by atey ghailan, app icon by greg rutkowski, app icon by greg tocchini, app icon by james gilleard, 8k, high resolution, best quality`,
        negative: (config) => `${config.negative}, photo, low-quality, deformed, text, poorly drawn`
    },

    "Concept Art Icon": {
        name: "Concept Art Icon",
        prompt: (config) => `${config.prompt}, a concept art icon, a digital art logo, illustration, league of legends style concept art logo icon, inspired by wlop style, 8k, fine details, sharp, very detailed, high resolution logo icon`,
        negative: (config) => `${config.negative}, low-quality, deformed, text, poorly drawn, multiple`
    },

    "Cute 3D Icon": {
        name: "Cute 3D Icon",
        prompt: (config) => `${config.prompt}, a cute 3D icon of ${config.prompt}, cartoon 3D icon, very cute shape, stylized octane render, 8k, masterpiece, soooo cute, beautiful cute perfection, beautiful soft lighting, soft colors, centered, high resolution, ${config.prompt}, soft gradient background`,
        negative: (config) => `${config.negative}, low quality, text, ugly, gross`
    },

    "Cute 3D Icon Set": {
        name: "Cute 3D Icon Set",
        prompt: (config) => `${config.prompt}, a set of lovely little 3D icons, cute 3D icons, very cute shapes, stylized octane render, 8k, masterpiece, soooo cute, beautiful cute perfection, beautiful soft lighting, soft colors, centered, high resolution, ${config.prompt}, cute icon set`,
        negative: (config) => `${config.negative}, low quality, text, ugly, gross`
    },

    "Crayon Drawing": {
        name: "Crayon Drawing",
        prompt: (config) => `${config.prompt}, crayon drawing`,
        negative: (config) => `${config.negative}, low-quality, deformed, text, poorly drawn`
    },

    "Pencil": {
        name: "Pencil",
        prompt: (config) => `((black and white pencil drawing)), ${config.prompt}, black and white, breathtaking pencil illustration, highly detailed, 4k, (textured paper), pencil texture, sketch`,
        negative: (config) => `${config.negative}, stationary, holding pen, holding paper, low-quality, deformed, photo, 3D render, text, poorly drawn`
    },

    "Tattoo Design": {
        name: "Tattoo Design",
        prompt: (config) => `amazing tattoo design, ${config.prompt}, breathtaking tattoo design, incredible tattoo design`,
        negative: (config) => `${config.negative}, low-quality, poorly drawn, blurry, faded, terrible design, worst quality, deformed, amputee, ((words)), ((letters))`
    },
};

export const styleList = Object.keys(artStyles);
