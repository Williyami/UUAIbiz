-- Add an outreach email template to Info & Resources, based on the example
-- in exampleoutreach.md at the repo root. Idempotent by title, same pattern
-- as the earlier info_sections seed.
INSERT INTO public.info_sections (title, body, sort_order)
SELECT v.title, v.body, v.sort_order
FROM (
  VALUES
    ('Outreach templates', $md$
## Cold outreach (first contact)
Use when reaching out to a new company contact, especially one who has previously shown interest.

> Dear [Contact name],
>
> My name is [Your name]. I serve as [Your role] at UU AI Society (UUAIS) at Uppsala University. We facilitate connections between organisations and a network of AI-focused students (Data Science, Machine Learning, Engineering, Finance and related programs) through events such as lunch lectures, workshops, hackathons and more.
>
> You previously indicated an interest in collaborating with our society. Given [Company]'s work and the areas our students are studying, I believe there is strong potential for a mutually valuable partnership.
>
> Would you be available for a brief call to explore possible formats and next steps? I am flexible and can adapt to a time that suits your schedule.
>
> Best regards,
>
> [Your name]
> [Your role]
> UU AI Society

**Tips**
- Swap in the specific reason the partnership fits ([Company]'s work + relevant student programs) — don't send it generic.
- Contact multiple people per company where possible; cold LinkedIn outreach works.
- Log the send in Outreach and set a follow-up reminder — don't let it go quiet after one message.
$md$, 5)
) AS v(title, body, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.info_sections s WHERE s.title = v.title);
