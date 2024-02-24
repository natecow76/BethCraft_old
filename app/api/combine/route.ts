import { connectToDatabase } from "@/utils/db/connectToDb";
import Elements from "@/utils/db/models/element.model";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const element1 = params.get("element1");
  const element2 = params.get("element2");

  if (!element1 || !element2) {
    return NextResponse.json(
      { erorr: "Missing element1 or element2" },
      { status: 400 }
    );
  }
  await connectToDatabase();
  let isNew = true;
  console.log("Checking if element exists");
  const element = await Elements.find({
    parentElements: [[element1], [element2]],
  });
  if (element.length > 0) {
    isNew = false;
    console.log("Element already exists");
    const randomIndex = Math.floor(Math.random() * element.length);
    console.log(element[randomIndex]);
    return NextResponse.json(
      {
        name: element[randomIndex].name,
        emoji: element[randomIndex].emoji,
        new: isNew,
      },
      { status: 200 }
    );
  }
  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY,
  });
  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `TASK: You are a hilarious joke writer. One of the funniest comics in the world. Your specialty is clever food puns. Combine ${element1} and ${element2} to create a new element. Try to keep the element as simple and realistic as possible and only 1 word. Use language in the style of Martha Stewart and your imagination. Make it funny. If two basic elements are combined, make a new thing out of that, rather than simply combining the words. Example: Earth + Earth = Solar System. Prioritize potenital foods as new elements. You are allowed to use one of the inputs as the output, but only if there are no realistic elements. Two of the same item should output a larger version of that item if applicable. Your response should be the name of the new element and MUST contain one and only one emoji to represent the element. The response should never have less than or more than 1 emoji. Example: Wood + Man = 🍆 Penis. Prioritize names of new elements that are as common as possible. Prioritize words used by chefs. Make sure the new element  is not just a combination of the two words, but something unique and different - and most importantly, funny. Find 5 potential responses and select the one that is the most unique and funny. It’s important you only respond with a single response that is a clever pun. The single response you select should be in json format to be parsed. Format: {new_element: "name", emoji: "emoji"}`,
      },
    ],
  });
  console.log(chatCompletion.choices[0].message.content);
  const response = chatCompletion.choices[0].message.content;
  if (response) {
    const { new_element, emoji } = JSON.parse(response);
    const newElement = await Elements.create({
      name: new_element,
      emoji: emoji,
      parentElements: [element1, element2],
    });
    return NextResponse.json(
      {
        name: newElement.name,
        emoji: newElement.emoji,
        new: isNew,
      },
      { status: 200 }
    );
  }
  return NextResponse.json(
    { error: "Failed to create new element" },
    { status: 500 }
  );
}
