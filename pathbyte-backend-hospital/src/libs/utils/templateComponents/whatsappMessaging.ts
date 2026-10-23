interface TemplateParams {
  [key: string]: string;
}

export function createBodyComponents(params: TemplateParams) {
  const parametersArray = Object.entries(params).map(
    ([parameter_name, text]) => ({
      type: "text",
      parameter_name,
      text,
    })
  );

  return [
    {
      type: "body",
      parameters: parametersArray,
    },
  ];
}

interface BodyParams {
  [key: string]: string;
}

interface HeaderDocument {
  mediaId: string;
  filename: string;
}

interface TemplateComponentsOptions {
  headerDocument?: HeaderDocument;
  bodyParams: BodyParams;
}

export function createTemplateComponents({
  headerDocument,
  bodyParams,
}: TemplateComponentsOptions) {
  const components: any[] = [];

  if (headerDocument) {
    components.push({
      type: "header",
      parameters: [
        {
          type: "document",
          document: {
            id: headerDocument.mediaId,
            filename: headerDocument.filename,
          },
        },
      ],
    });
  }

  const bodyParameters = Object.entries(bodyParams).map(
    ([parameter_name, text]) => ({
      type: "text",
      parameter_name,
      text,
    })
  );

  components.push({
    type: "body",
    parameters: bodyParameters,
  });

  return components;
}
